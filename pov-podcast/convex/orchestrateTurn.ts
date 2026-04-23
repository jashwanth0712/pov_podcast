"use node";

/**
 * orchestrateTurn Convex action.
 *
 * Selects the next speaker using the active turn-taking mode, checks for
 * deadlock, triggers moderator escalation if needed, calls generatePersonaTurn
 * for the selected persona, and pre-generates 2–4 turns ahead in parallel.
 *
 * Requirements: 14.2, 14.3, 14.4, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7,
 *               20.3, 21.6
 */

import { internalAction, action } from "./_generated/server";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  selectNextSpeakerRelevance,
  selectNextSpeakerRoundRobin,
  selectNextSpeakerRandom,
  detectDeadlock,
  type PersonaForScoring,
  type RelationshipForScoring,
} from "./lib/turnTaking";
import { models } from "./lib/modelConfig";
import type { Id } from "./_generated/dataModel";

// ─── Internal queries ─────────────────────────────────────────────────────────

// ─── Moderator turn generation ────────────────────────────────────────────────

const MODERATOR_SYSTEM_PROMPT = `You are a neutral moderator facilitating a historical discussion. Your role is to:
1. Acknowledge the perspectives that have been shared
2. Introduce a new angle, question, or dimension to the conversation
3. Break any conversational deadlock by redirecting focus
4. Remain completely neutral — you have no historical point of view of your own
5. Keep your intervention brief (2–3 sentences maximum)
6. Do not take sides or validate any particular perspective

You speak in a calm, measured, professional tone. You are not a historical figure.`;

/**
 * Generates a moderator intervention turn.
 * Requirements: 17.3, 17.4, 17.5, 17.6, 17.7
 */
export const generateModeratorTurn = internalAction({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    triggerReason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; turnId?: Id<"dialogueTurns">; error?: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENROUTER_API_KEY not configured" };
    }

    // Load recent turns for context
    const recentTurns = await ctx.runQuery(
      internal.orchestrateQueries.queryRecentTurnsForOrchestration,
      { branchId: args.branchId, limit: 6 }
    );

    const conversationContext = recentTurns
      .reverse()
      .map((t) => `${t.speakerName}: ${t.text}`)
      .join("\n\n");

    const userMessage = args.triggerReason
      ? `The conversation has reached a deadlock (${args.triggerReason}). Please intervene to redirect the discussion.\n\nRecent conversation:\n${conversationContext}`
      : `Please provide a brief moderating intervention to keep the conversation moving.\n\nRecent conversation:\n${conversationContext}`;

    // Enforce 5-second timeout (Req 17.5)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let moderatorText: string;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pov-podcast.app",
          "X-Title": "POV Podcast",
        },
        body: JSON.stringify({
          model: models.light,
          messages: [
            { role: "system", content: MODERATOR_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 150,
          temperature: 0.5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `OpenRouter error: ${response.status}` };
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      moderatorText = data.choices?.[0]?.message?.content ?? "";
      if (!moderatorText) {
        return { success: false, error: "Empty moderator response" };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, error: "Moderator turn timed out after 5 seconds" };
      }
      return {
        success: false,
        error: `Moderator generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Get session for depth level and turn index
    const session = await ctx.runQuery(
      internal.orchestrateQueries.querySessionForOrchestration,
      { sessionId: args.sessionId }
    );
    if (!session) return { success: false, error: "Session not found" };

    const allTurns = await ctx.runQuery(
      internal.orchestrateQueries.queryRecentTurnsForOrchestration,
      { branchId: args.branchId, limit: 1000 }
    );
    const nextTurnIndex = allTurns.length;

    // Persist moderator turn
    const turnId = await ctx.runMutation(internal.sessionMutations.persistDialogueTurn, {
      sessionId: args.sessionId,
      branchId: args.branchId,
      speakerId: "moderator",
      speakerName: "Moderator",
      text: moderatorText,
      turnIndex: nextTurnIndex,
      articleReferences: [],
      emotionalStateSnapshot: undefined,
      qualityWarning: false,
      depthLevel: session.depthLevel,
    });

    return { success: true, turnId };
  },
});

// ─── Main orchestrateTurn action ──────────────────────────────────────────────

/**
 * orchestrateTurn — selects the next speaker, checks for deadlock,
 * and triggers turn generation.
 *
 * Requirements: 14.2, 14.3, 14.4, 17.1, 17.2, 17.3, 20.3, 21.6
 */
export const orchestrateTurn = internalAction({
  args: {
    sessionId: v.id("sessions"),
    /** Optional: force a specific persona to speak next (overrides turn-taking mode) */
    forcedPersonaId: v.optional(v.id("personas")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    nextSpeakerId?: string;
    deadlockDetected?: boolean;
    error?: string;
  }> => {
    // ── Load session and context ──────────────────────────────────────────────
    const session = await ctx.runQuery(
      internal.orchestrateQueries.querySessionForOrchestration,
      { sessionId: args.sessionId }
    );

    if (!session) return { success: false, error: "Session not found" };
    if (session.status !== "active") {
      return { success: false, error: "Session is not active" };
    }

    const branchId = session.activeBranchId;
    if (!branchId) return { success: false, error: "Session has no active branch" };

    const [personaStates, recentTurnsDesc, relationships] = await Promise.all([
      ctx.runQuery(internal.orchestrateQueries.queryPersonaStatesForOrchestration, {
        sessionId: args.sessionId,
        branchId,
      }),
      ctx.runQuery(internal.orchestrateQueries.queryRecentTurnsForOrchestration, {
        branchId,
        limit: 10,
      }),
      ctx.runQuery(internal.orchestrateQueries.queryRelationshipsForOrchestration, {
        scenarioId: session.scenarioId,
      }),
    ]);

    // recentTurnsDesc is ordered desc; reverse for chronological order
    const recentTurns = [...recentTurnsDesc].reverse();
    const lastTurn = recentTurns[recentTurns.length - 1] ?? null;
    const lastSpeakerId =
      lastTurn?.speakerId && lastTurn.speakerId !== "user" && lastTurn.speakerId !== "moderator"
        ? (lastTurn.speakerId as string)
        : null;
    const lastTurnText = lastTurn?.text ?? "";

    // ── Deadlock detection (Req 17.1) ─────────────────────────────────────────
    const deadlockDetected = detectDeadlock(
      recentTurns.map((t) => ({
        speakerId: typeof t.speakerId === "string" ? t.speakerId : String(t.speakerId),
        text: t.text,
      }))
    );

    if (deadlockDetected) {
      // Log deadlock event (Req 17.2)
      await ctx.runMutation(internal.sessionMutations.logDeadlockEvent, {
        sessionId: args.sessionId,
        branchId,
        detectedAtTurnIndex: recentTurns.length,
        escalationAction: "moderator_turn",
      });

      // Trigger moderator turn (Req 17.3, 17.4)
      await ctx.runAction(internal.orchestrateTurn.generateModeratorTurn, {
        sessionId: args.sessionId,
        branchId,
        triggerReason: "deadlock detected — same ideological positions repeated ≥3 times",
      });

      // After the moderator breaks deadlock, schedule a fresh round of
      // persona turns so playback continues without the frontend needing
      // to poll for more. Pick a persona that wasn't the last speaker so
      // we pivot away from the repeating ideological pair.
      const personaIds = session.personaIds.map((id) => String(id));
      if (personaIds.length > 0) {
        const pivotCandidates = personaIds.filter((id) => id !== lastSpeakerId);
        const pool = pivotCandidates.length > 0 ? pivotCandidates : personaIds;
        const pivotIndex = Math.floor(Math.random() * pool.length);
        const pivotSpeakerId = pool[pivotIndex] as Id<"personas">;

        const lookaheadCount = Math.min(3, personaIds.length);
        const startIndex = personaIds.indexOf(pivotSpeakerId);
        for (let i = 0; i < lookaheadCount; i++) {
          const idx = (startIndex + i) % personaIds.length;
          await ctx.scheduler.runAfter(
            i * 100,
            internal.generatePersonaTurn.generatePersonaTurn,
            {
              sessionId: args.sessionId,
              personaId: personaIds[idx] as Id<"personas">,
              branchId,
            }
          );
        }
      }

      return { success: true, deadlockDetected: true };
    }

    // ── Select next speaker ───────────────────────────────────────────────────
    let nextSpeakerId: string;

    if (args.forcedPersonaId) {
      // Forced speaker overrides turn-taking mode
      nextSpeakerId = args.forcedPersonaId;
    } else {
      const personaIds = session.personaIds.map((id) => String(id));

      switch (session.turnTakingMode) {
        case "Relevance": {
          // Requirements: 14.2, 20.3, 21.6
          const personasForScoring: PersonaForScoring[] = personaStates.map((s) => ({
            personaId: String(s.personaId),
            emotionalState: s.emotionalState,
            ideologicalPosition: s.ideologicalPosition,
          }));

          const relForScoring: RelationshipForScoring[] = relationships.map((r) => ({
            personaAId: String(r.personaAId),
            personaBId: String(r.personaBId),
            relationshipType: r.relationshipType,
          }));

          nextSpeakerId = selectNextSpeakerRelevance(
            personasForScoring,
            lastSpeakerId,
            lastTurnText,
            relForScoring
          );
          break;
        }

        case "RoundRobin": {
          // Requirements: 14.3
          const { personaId, nextIndex } = selectNextSpeakerRoundRobin(
            personaIds,
            session.roundRobinIndex
          );
          nextSpeakerId = personaId;

          // Persist updated round-robin index
          await ctx.runMutation(internal.sessionMutations.updateRoundRobinIndex, {
            sessionId: args.sessionId,
            nextIndex,
          });
          break;
        }

        case "Random": {
          // Requirements: 14.4
          nextSpeakerId = selectNextSpeakerRandom(personaIds, lastSpeakerId);
          break;
        }

        default:
          return { success: false, error: `Unknown turn-taking mode: ${session.turnTakingMode}` };
      }
    }

    // ── Generate the selected persona's turn ──────────────────────────────────
    await ctx.runAction(internal.generatePersonaTurn.generatePersonaTurn, {
      sessionId: args.sessionId,
      personaId: nextSpeakerId as Id<"personas">,
      branchId,
    });

    // ── Pre-generate 2–4 turns ahead in parallel (text only) (Req 4.4, 21.6) ──
    // We schedule these as background actions so they don't block the current turn.
    // They generate text only (no TTS) and persist to the DB for the frontend to pick up.
    const personaIds = session.personaIds.map((id) => String(id));
    const lookaheadCount = Math.min(
      Math.max(2, Math.floor(Math.random() * 3) + 2), // 2–4
      personaIds.length
    );

    // Build a simple round-robin lookahead sequence starting from the next speaker
    const nextSpeakerIndex = personaIds.indexOf(nextSpeakerId);
    for (let i = 1; i <= lookaheadCount; i++) {
      const lookaheadIndex = (nextSpeakerIndex + i) % personaIds.length;
      const lookaheadPersonaId = personaIds[lookaheadIndex] as Id<"personas">;

      // Schedule with a small delay so they don't all fire simultaneously
      await ctx.scheduler.runAfter(
        i * 100,
        internal.generatePersonaTurn.generatePersonaTurn,
        {
          sessionId: args.sessionId,
          personaId: lookaheadPersonaId,
          branchId,
        }
      );
    }

    return { success: true, nextSpeakerId };
  },
});

// ─── Public action: requestNextTurn ──────────────────────────────────────────

/**
 * Public action that the frontend calls to request the next dialogue turn.
 * Validates auth and session state, then delegates to orchestrateTurn.
 *
 * Requirements: 3.3, 4.1, 14.2, 14.3, 14.4
 */
export const requestNextTurn = action({
  args: {
    sessionId: v.id("sessions"),
    forcedPersonaId: v.optional(v.id("personas")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    const result = await ctx.runAction(internal.orchestrateTurn.orchestrateTurn, {
      sessionId: args.sessionId,
      forcedPersonaId: args.forcedPersonaId,
    });

    return result;
  },
});
