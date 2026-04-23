"use node";

/**
 * submitInterruption Convex action.
 *
 * Single entry point for user interruptions. Orchestrates:
 *   1. Input validation (validateInterruptionInput)
 *   2. Content moderation (moderateInterruption)
 *   3. Fork point recording + new branch creation
 *   4. User turn persistence on the new branch
 *   5. Session activeBranchId update
 *   6. Scheduling orchestrateTurn to generate a persona response
 *
 * Must be a Convex **action** (not mutation) because it calls
 * `moderateInterruption`, which is itself a "use node" action.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.7
 */

import { action, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ─── Inline validation ────────────────────────────────────────────────────────
// Inlined from src/lib/interruptionValidation.ts so the Convex action (Node.js
// runtime) does not need to import from the Next.js src tree.
// The canonical shared version lives in src/lib/interruptionValidation.ts.

const INTERRUPTION_MAX_LENGTH = 1000;

function validateInterruptionInput(text: string): { valid: boolean; error?: string } {
  if (text.length === 0) {
    return { valid: false, error: "Interruption must contain at least 1 character." };
  }
  if (text.trim().length === 0) {
    return {
      valid: false,
      error: "Interruption must contain at least one non-whitespace character.",
    };
  }
  if (text.length > INTERRUPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Interruption must be no more than ${INTERRUPTION_MAX_LENGTH} characters long.`,
    };
  }
  return { valid: true };
}

// ─── Internal query: load session for interruption ────────────────────────────

export const querySessionForInterruption = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// ─── Internal mutation: create branch for interruption ───────────────────────

/**
 * Creates a new branch forked from the current active branch at the given
 * turn index, and instantiates personaAgentStates for each persona on the
 * new branch (copying from the parent branch's current states).
 *
 * Returns the new branchId.
 *
 * Requirements: 5.4, 16.1, 16.2
 */
export const createInterruptionBranch = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    forkPointTurnIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found.");

    const now = Date.now();
    const parentBranchId = session.activeBranchId;

    // Create the new branch (Req 5.4, 16.1)
    const newBranchId = await ctx.db.insert("branches", {
      sessionId: args.sessionId,
      parentBranchId,
      forkPointTurnIndex: args.forkPointTurnIndex,
      forkPointTurnId: undefined,
      createdAt: now,
      lastNavigatedAt: now, // mark as navigated immediately so it won't be auto-pruned
      isPruned: false,
    });

    // Copy personaAgentStates from parent branch to new branch (Req 16.2, 21.8)
    const parentStates = await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_branchId", (q) =>
        q.eq("sessionId", args.sessionId).eq("branchId", parentBranchId)
      )
      .collect();

    for (const parentState of parentStates) {
      await ctx.db.insert("personaAgentStates", {
        sessionId: args.sessionId,
        personaId: parentState.personaId,
        branchId: newBranchId,
        emotionalState: parentState.emotionalState,
        contextMessages: parentState.contextMessages,
        compactionSummaries: parentState.compactionSummaries,
        messageCount: parentState.messageCount,
        lastUpdatedAt: now,
      });
    }

    return newBranchId;
  },
});

// ─── Internal mutation: persist user interruption turn ───────────────────────

/**
 * Persists the user's interruption as a dialogue turn on the new branch,
 * and updates the session's activeBranchId to the new branch.
 *
 * Requirements: 5.4, 5.5
 */
export const persistUserInterruptionTurn = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    text: v.string(),
    turnIndex: v.number(),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Persist the user's message as a dialogue turn (Req 5.5)
    const turnId = await ctx.db.insert("dialogueTurns", {
      sessionId: args.sessionId,
      branchId: args.branchId,
      turnIndex: args.turnIndex,
      speakerId: "user",
      speakerName: "You",
      text: args.text,
      audioUrl: undefined,
      timestamp: now,
      articleReferences: [],
      emotionalStateSnapshot: undefined,
      qualityWarning: false,
      isUserInterruption: true,
      depthLevel: args.depthLevel,
    });

    // Update session's activeBranchId to the new branch (Req 5.4)
    await ctx.db.patch(args.sessionId, {
      activeBranchId: args.branchId,
      lastActivityAt: now,
    });

    return turnId;
  },
});

// ─── Public action: submitInterruption ───────────────────────────────────────

/**
 * submitInterruption — public action.
 *
 * Called directly from the frontend when the user submits an interruption.
 * Validates input, moderates content, records fork point, creates a new
 * branch, persists the user turn, and schedules persona response generation.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.7
 */
export const submitInterruption = action({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
    turnIndex: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    branchId?: Id<"branches">;
    rejectionReason?: string;
    error?: string;
  }> => {
    // ── 1. Authenticate ───────────────────────────────────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated. Please log in." };
    }

    // ── 2. Validate input (Req 5.3, 5.8) ─────────────────────────────────────
    const validation = validateInterruptionInput(args.text);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // ── 3. Load session ───────────────────────────────────────────────────────
    const session = await ctx.runQuery(
      internal.interruptions.querySessionForInterruption,
      { sessionId: args.sessionId }
    );

    if (!session) {
      return { success: false, error: "Session not found." };
    }
    if (session.status !== "active") {
      return { success: false, error: "Session is not active." };
    }

    // ── 4. Content moderation (Req 25.1–25.5) ────────────────────────────────
    const moderationResult = await ctx.runAction(
      internal.moderateInterruption.moderateInterruption,
      {
        sessionId: args.sessionId,
        text: args.text,
      }
    );

    if (moderationResult.classification === "UNSAFE") {
      // Return rejection reason to frontend for display (Req 25.3)
      return {
        success: false,
        rejectionReason: moderationResult.reason,
        error: `Your message was not accepted: ${moderationResult.reason}`,
      };
    }

    // ── 5. Record fork point + create new branch (Req 5.4, 16.1) ─────────────
    // The fork point is the current turn index passed by the frontend.
    const newBranchId = await ctx.runMutation(
      internal.interruptions.createInterruptionBranch,
      {
        sessionId: args.sessionId,
        forkPointTurnIndex: args.turnIndex,
      }
    );

    // ── 6. Determine turn index on new branch ─────────────────────────────────
    // The new branch starts from the fork point. The user's message is turn 0
    // on the new branch (relative to the fork point), but we use the absolute
    // turn index from the fork point for consistency with the branch's own sequence.
    // Since the new branch is empty, the user turn is at index 0.
    const userTurnIndex = 0;

    // ── 7. Persist user turn + update activeBranchId (Req 5.4, 5.5) ──────────
    await ctx.runMutation(internal.interruptions.persistUserInterruptionTurn, {
      sessionId: args.sessionId,
      branchId: newBranchId,
      text: args.text,
      turnIndex: userTurnIndex,
      depthLevel: session.depthLevel,
    });

    // ── 8. Schedule persona response generation (Req 5.5, 5.6, 5.7) ──────────
    // orchestrateTurn will select the most relevant persona to respond to the
    // user's message and continue generating turns on the new branch.
    // Scheduled with runAfter(0) so the mutation above commits first.
    await ctx.scheduler.runAfter(0, internal.orchestrateTurn.orchestrateTurn, {
      sessionId: args.sessionId,
    });

    return { success: true, branchId: newBranchId };
  },
});
