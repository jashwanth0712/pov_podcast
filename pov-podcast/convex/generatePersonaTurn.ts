"use node";

/**
 * generatePersonaTurn Convex action.
 *
 * Assembles the context window for a persona agent, calls OpenRouter to
 * generate a dialogue turn, validates expressiveness and consistency,
 * persists the turn, updates emotional state, and checks if context
 * compaction is needed.
 *
 * Requirements: 3.3, 3.5, 8.1, 8.3, 8.4, 8.5, 8.6, 15.2, 15.4, 15.8
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { assemblePersonaSystemPrompt } from "./lib/promptAssembly";
import { validateExpressiveness } from "./lib/expressiveness";
import { models } from "./lib/modelConfig";
import type { Id } from "./_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonaData {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  personalityTraits: string[];
  emotionalBackstory: string;
  speakingStyle: string;
  ideologicalPosition: string;
  voiceId: string;
  articleReferences: Array<{
    url: string;
    title: string;
    isVerified: boolean;
    isIllustrative: boolean;
    ideologicalAlignment: string;
  }>;
}

interface PersonaAgentState {
  emotionalState: {
    mood: "calm" | "frustrated" | "passionate" | "defensive" | "resigned";
    convictionLevel: number;
    willingnessToConcede: number;
  };
  contextMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
    personaId?: Id<"personas">;
    turnIndex: number;
  }>;
  compactionSummaries: Array<{
    summary: string;
    coveredTurnRange: number[];
    generatedAt: number;
    marker: "[COMPACTED HISTORY]";
  }>;
  messageCount: number;
}

interface DialogueTurn {
  speakerId: Id<"personas"> | "user" | "moderator";
  speakerName: string;
  text: string;
  turnIndex: number;
}

interface PersonaRelationship {
  personaAId: Id<"personas">;
  personaBId: Id<"personas">;
  relationshipType:
    | "alliance"
    | "rivalry"
    | "mentor_student"
    | "ideological_kinship"
    | "historical_enmity";
  description: string;
}

interface GenerationContext {
  persona: PersonaData;
  agentState: PersonaAgentState;
  relationships: PersonaRelationship[];
  recentTurns: DialogueTurn[];
  lastSpeakerName: string | null;
  session: {
    depthLevel: "Casual" | "Intermediate" | "Scholar";
    activeBranchId: Id<"branches">;
  };
  nextTurnIndex: number;
}

// ─── Internal query: load all context needed for generation ───────────────────

export const getGenerationContext = internalAction({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args): Promise<GenerationContext | null> => {
    const [session, persona, agentState, recentTurns, relationships] = await Promise.all([
      ctx.runQuery(internal.generatePersonaTurnQueries.querySession, { sessionId: args.sessionId }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryPersona, { personaId: args.personaId }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryAgentState, {
        sessionId: args.sessionId,
        personaId: args.personaId,
        branchId: args.branchId,
      }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryRecentTurns, {
        branchId: args.branchId,
        limit: 20,
      }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryRelationships, {
        scenarioId: (await ctx.runQuery(internal.generatePersonaTurnQueries.querySession, {
          sessionId: args.sessionId,
        }))!.scenarioId,
      }),
    ]);

    if (!session || !persona || !agentState) return null;
    if (!session.activeBranchId) return null;

    const lastTurn = recentTurns[recentTurns.length - 1] ?? null;
    const lastSpeakerName = lastTurn?.speakerName ?? null;
    const nextTurnIndex = recentTurns.length;

    return {
      persona,
      agentState,
      relationships,
      recentTurns,
      lastSpeakerName,
      session: {
        depthLevel: session.depthLevel,
        activeBranchId: session.activeBranchId,
      },
      nextTurnIndex,
    };
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the shared conversation log string from recent turns.
 * This is appended as a user message so the persona sees the full dialogue.
 */
function buildSharedConversationLog(turns: DialogueTurn[]): string {
  if (turns.length === 0) {
    return "The conversation is just beginning. You are the first to speak.";
  }

  const lines = turns.map(
    (t) => `[Turn ${t.turnIndex + 1}] ${t.speakerName}: ${t.text}`
  );

  return `SHARED CONVERSATION LOG (all participants, most recent last):\n\n${lines.join("\n\n")}`;
}

/**
 * Finds the relationship between this persona and the preceding speaker.
 */
function findPrecedingRelationship(
  personaId: Id<"personas">,
  lastSpeakerId: Id<"personas"> | "user" | "moderator" | null,
  relationships: PersonaRelationship[]
): PersonaRelationship | undefined {
  if (!lastSpeakerId || lastSpeakerId === "user" || lastSpeakerId === "moderator") {
    return undefined;
  }

  return relationships.find(
    (r) =>
      (r.personaAId === personaId && r.personaBId === lastSpeakerId) ||
      (r.personaAId === lastSpeakerId && r.personaBId === personaId)
  );
}

/**
 * Calls OpenRouter to generate a dialogue turn.
 */
async function callOpenRouter(
  systemPrompt: string,
  compactionSummaries: PersonaAgentState["compactionSummaries"],
  recentContextMessages: PersonaAgentState["contextMessages"],
  sharedConversationLog: string,
  apiKey: string
): Promise<string> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Inject compaction summaries as user messages (Req 23.3)
  for (const summary of compactionSummaries) {
    messages.push({
      role: "user",
      content: `${summary.marker}\n\n${summary.summary}`,
    });
  }

  // Inject recent context messages
  for (const msg of recentContextMessages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Append shared conversation log as the final user message
  messages.push({ role: "user", content: sharedConversationLog });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pov-podcast.app",
      "X-Title": "POV Podcast",
    },
    body: JSON.stringify({
      model: models.conversation,
      messages,
      max_tokens: 160,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }

  return content;
}

type EmotionalStateShape = PersonaAgentState["emotionalState"];

const VALID_MOODS: ReadonlyArray<EmotionalStateShape["mood"]> = [
  "calm",
  "frustrated",
  "passionate",
  "defensive",
  "resigned",
];

/**
 * Parses the structured `MOOD: / CONVICTION: / CONCEDE:` suffix that the
 * persona prompt requires the LLM to append, and returns both the updated
 * emotional state and the spoken text with the suffix stripped.
 *
 * If the suffix is missing or malformed, falls back to the current state
 * (no change) and returns the raw text untouched.
 */
function parseEmotionalStateFromTurn(
  currentState: EmotionalStateShape,
  rawTurnText: string
): { spokenText: string; nextState: EmotionalStateShape } {
  // Match each line anywhere near the end of the response. Tolerate minor
  // formatting drift (case, leading whitespace, trailing commentary).
  const moodMatch = rawTurnText.match(/^[ \t]*MOOD\s*:\s*([A-Za-z]+)\s*$/im);
  const convictionMatch = rawTurnText.match(
    /^[ \t]*CONVICTION\s*:\s*([0-9]*\.?[0-9]+)\s*$/im
  );
  const concedeMatch = rawTurnText.match(
    /^[ \t]*CONCEDE\s*:\s*([0-9]*\.?[0-9]+)\s*$/im
  );

  // Strip any of the structured lines we found (and a trailing blank line
  // before them) from the spoken text.
  let spokenText = rawTurnText
    .replace(/^[ \t]*MOOD\s*:\s*[A-Za-z]+\s*$/gim, "")
    .replace(/^[ \t]*CONVICTION\s*:\s*[0-9]*\.?[0-9]+\s*$/gim, "")
    .replace(/^[ \t]*CONCEDE\s*:\s*[0-9]*\.?[0-9]+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const clamp = (n: number): number => Math.max(0, Math.min(1, n));

  const parsedMood = moodMatch?.[1]?.toLowerCase() as
    | EmotionalStateShape["mood"]
    | undefined;
  const nextMood =
    parsedMood && VALID_MOODS.includes(parsedMood)
      ? parsedMood
      : currentState.mood;

  const convictionRaw = convictionMatch?.[1]
    ? Number.parseFloat(convictionMatch[1])
    : NaN;
  const nextConviction = Number.isFinite(convictionRaw)
    ? clamp(convictionRaw)
    : currentState.convictionLevel;

  const concedeRaw = concedeMatch?.[1]
    ? Number.parseFloat(concedeMatch[1])
    : NaN;
  const nextConcede = Number.isFinite(concedeRaw)
    ? clamp(concedeRaw)
    : currentState.willingnessToConcede;

  // Defensive: if parsing gave us nothing (model disobeyed the format
  // entirely), also fall back to the raw text so we don't accidentally
  // strip a legitimate line that happened to start with MOOD:.
  if (!moodMatch && !convictionMatch && !concedeMatch) {
    spokenText = rawTurnText.trim();
  }

  return {
    spokenText,
    nextState: {
      mood: nextMood,
      convictionLevel: nextConviction,
      willingnessToConcede: nextConcede,
    },
  };
}

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * generatePersonaTurn — internal action.
 *
 * Assembles context window, calls OpenRouter, validates expressiveness,
 * persists turn, updates emotional state, and triggers compaction if needed.
 *
 * Requirements: 3.3, 3.5, 8.1, 8.3, 8.4, 8.5, 8.6, 15.2, 15.4, 15.8
 */
export const generatePersonaTurn = internalAction({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    turnId?: Id<"dialogueTurns">;
    qualityWarning?: boolean;
    error?: string;
  }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENROUTER_API_KEY not configured" };
    }

    // ── Load context ──────────────────────────────────────────────────────────
    const [session, persona, agentState] = await Promise.all([
      ctx.runQuery(internal.generatePersonaTurnQueries.querySession, { sessionId: args.sessionId }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryPersona, { personaId: args.personaId }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryAgentState, {
        sessionId: args.sessionId,
        personaId: args.personaId,
        branchId: args.branchId,
      }),
    ]);

    if (!session) return { success: false, error: "Session not found" };
    if (!persona) return { success: false, error: "Persona not found" };
    if (!agentState) return { success: false, error: "Persona agent state not found" };

    const [recentTurns, relationships] = await Promise.all([
      ctx.runQuery(internal.generatePersonaTurnQueries.queryRecentTurns, {
        branchId: args.branchId,
        limit: 20,
      }),
      ctx.runQuery(internal.generatePersonaTurnQueries.queryRelationships, {
        scenarioId: session.scenarioId,
      }),
    ]);

    const lastTurn = recentTurns[recentTurns.length - 1] ?? null;
    const nextTurnIndex = recentTurns.length;

    // ── Find preceding relationship ───────────────────────────────────────────
    const precedingRelationship = lastTurn
      ? findPrecedingRelationship(args.personaId, lastTurn.speakerId, relationships)
      : undefined;

    const precedingRelationshipForPrompt = precedingRelationship
      ? {
          otherPersonaName: lastTurn!.speakerName,
          relationshipType: precedingRelationship.relationshipType,
          description: precedingRelationship.description,
        }
      : undefined;

    // ── Assemble system prompt (Req 3.4, 3.5, 19.3, 20.2, 20.5, 21.4, 21.9) ──
    const systemPrompt = assemblePersonaSystemPrompt(
      {
        name: persona.name,
        historicalRole: persona.historicalRole,
        personalityTraits: persona.personalityTraits,
        emotionalBackstory: persona.emotionalBackstory,
        speakingStyle: persona.speakingStyle,
        ideologicalPosition: persona.ideologicalPosition,
        articleReferences: persona.articleReferences,
        relationships: relationships
          .filter(
            (r) => r.personaAId === args.personaId || r.personaBId === args.personaId
          )
          .map((r) => {
            const otherPersonaId =
              r.personaAId === args.personaId ? r.personaBId : r.personaAId;
            // We'll use the ID as a placeholder name; the full name lookup would
            // require an extra query. The relationship description carries the context.
            return {
              otherPersonaName: String(otherPersonaId),
              relationshipType: r.relationshipType,
              description: r.description,
            };
          }),
      },
      {
        depthLevel: session.depthLevel,
        emotionalState: agentState.emotionalState,
        precedingSpeakerName: lastTurn?.speakerName ?? undefined,
        precedingRelationship: precedingRelationshipForPrompt,
      }
    );

    // ── Build shared conversation log ─────────────────────────────────────────
    const sharedConversationLog = buildSharedConversationLog(
      recentTurns.map((t) => ({
        speakerId: t.speakerId,
        speakerName: t.speakerName,
        text: t.text,
        turnIndex: t.turnIndex,
      }))
    );

    // ── Generate turn (with up to 2 attempts for expressiveness) ─────────────
    // Requirements: 8.3, 8.4, 8.5, 8.6, 15.2, 15.4
    let generatedText: string | null = null;
    let qualityWarning = false;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const text = await callOpenRouter(
          systemPrompt,
          agentState.compactionSummaries,
          agentState.contextMessages,
          sharedConversationLog,
          apiKey
        );

        // Validate expressiveness (Req 15.2)
        if (validateExpressiveness(text)) {
          generatedText = text;
          break;
        }

        // First attempt failed expressiveness — try once more
        if (attempts < maxAttempts) {
          continue;
        }

        // Both attempts failed — deliver with quality warning (Req 8.6, 15.4)
        generatedText = text;
        qualityWarning = true;
      } catch (err) {
        if (attempts >= maxAttempts) {
          return {
            success: false,
            error: `Failed to generate turn after ${maxAttempts} attempts: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }
    }

    if (!generatedText) {
      return { success: false, error: "Failed to generate dialogue turn" };
    }

    // ── Parse the structured MOOD / CONVICTION / CONCEDE suffix ──────────────
    // The prompt requires the model to append these lines; we use them as the
    // authoritative emotional-state update and strip them from the spoken text.
    const { spokenText, nextState: newEmotionalState } =
      parseEmotionalStateFromTurn(agentState.emotionalState, generatedText);

    // ── Persist turn (Req 7.4, 13.2, 21.1) ───────────────────────────────────
    const turnId = await ctx.runMutation(internal.sessionMutations.persistDialogueTurn, {
      sessionId: args.sessionId,
      branchId: args.branchId,
      speakerId: args.personaId,
      speakerName: persona.name,
      text: spokenText,
      turnIndex: nextTurnIndex,
      articleReferences: persona.articleReferences.slice(0, 3),
      emotionalStateSnapshot: agentState.emotionalState,
      qualityWarning,
      depthLevel: session.depthLevel,
    });

    const newContextMessage = {
      role: "assistant" as const,
      content: spokenText,
      personaId: args.personaId,
      turnIndex: nextTurnIndex,
    };

    await ctx.runMutation(internal.sessionMutations.updatePersonaEmotionalState, {
      sessionId: args.sessionId,
      personaId: args.personaId,
      branchId: args.branchId,
      emotionalState: newEmotionalState,
      newMessage: newContextMessage,
    });

    // ── Check if compaction is needed (Req 23.1) ──────────────────────────────
    // Compaction triggers when messageCount reaches 20
    const newMessageCount = agentState.messageCount + 1;
    if (newMessageCount >= 20) {
      await ctx.scheduler.runAfter(0, internal.compactPersonaContext.compactPersonaContext, {
        sessionId: args.sessionId,
        personaId: args.personaId,
        branchId: args.branchId,
      });
    }

    return { success: true, turnId, qualityWarning };
  },
});
