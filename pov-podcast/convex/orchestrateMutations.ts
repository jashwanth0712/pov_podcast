import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Records user intent to invoke the Moderator, then schedules the
 * generateModeratorTurn action.
 * Requirements: 17.4
 */
export const triggerModerator = mutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found.");
    if (session.status !== "active") throw new Error("Session is not active.");

    await ctx.scheduler.runAfter(0, internal.orchestrateTurn.generateModeratorTurn, {
      sessionId: args.sessionId,
      branchId: args.branchId,
      triggerReason: "user-triggered",
    });

    return { success: true };
  },
});
