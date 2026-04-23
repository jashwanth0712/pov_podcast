import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Logs a rejected interruption to the `rejectedInterruptions` table.
 * Only stores sessionId, timestamp, and rejectionReason — NOT the full content
 * (Req 25.4).
 */
export const logRejectedInterruption = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rejectedInterruptions", {
      sessionId: args.sessionId,
      timestamp: Date.now(),
      rejectionReason: args.rejectionReason,
    });
  },
});
