/**
 * Scheduled branch management mutations.
 *
 * Requirements: 16.6, 16.7
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Auto-prunes all branches for a session that have never been navigated
 * (lastNavigatedAt is null/undefined) and are not already pruned.
 *
 * Does NOT prune the root branch (parentBranchId is null/undefined).
 *
 * Fired when a session transitions to `paused` or `completed` status.
 *
 * Requirements: 16.6, 16.7
 */
export const autoPruneBranches = internalMutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    // Query all branches for this session
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Filter: never navigated (lastNavigatedAt is undefined/null), not already pruned,
    // and not the root branch (parentBranchId must be defined/non-null)
    const branchesToPrune = branches.filter(
      (b) =>
        !b.isPruned &&
        b.lastNavigatedAt === undefined &&
        b.parentBranchId !== undefined &&
        b.parentBranchId !== null
    );

    // Prune each qualifying branch
    for (const branch of branchesToPrune) {
      await ctx.runMutation(internal.sessionMutations.pruneBranch, {
        sessionId: args.sessionId,
        branchId: branch._id,
      });
    }

    return { prunedCount: branchesToPrune.length };
  },
});
