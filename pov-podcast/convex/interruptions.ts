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

import { action } from "./_generated/server";
import { v } from "convex/values";
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
      internal.interruptionHelpers.querySessionForInterruption,
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
      internal.interruptionHelpers.createInterruptionBranch,
      {
        sessionId: args.sessionId,
        forkPointTurnIndex: args.turnIndex,
      }
    );

    // ── 6. Determine turn index on new branch ─────────────────────────────────
    // The new branch now contains a copy of parent turns up through
    // forkPointTurnIndex, so the user's interruption appends right after.
    const userTurnIndex = args.turnIndex + 1;

    // ── 7. Persist user turn + update activeBranchId (Req 5.4, 5.5) ──────────
    await ctx.runMutation(internal.interruptionHelpers.persistUserInterruptionTurn, {
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
