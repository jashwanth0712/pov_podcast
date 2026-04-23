import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Persists the compaction summary and replaces the compacted messages.
 * Requirements: 23.4, 23.5
 */
export const persistCompaction = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
    summary: v.string(),
    coveredTurnRange: v.array(v.number()),
    remainingMessages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
        personaId: v.optional(v.id("personas")),
        turnIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_personaId", (q) =>
        q.eq("sessionId", args.sessionId).eq("personaId", args.personaId)
      )
      .filter((q) => q.eq(q.field("branchId"), args.branchId))
      .first();

    if (!state) return;

    const newSummary = {
      summary: args.summary,
      coveredTurnRange: args.coveredTurnRange,
      generatedAt: Date.now(),
      marker: "[COMPACTED HISTORY]" as const,
    };

    await ctx.db.patch(state._id, {
      compactionSummaries: [...state.compactionSummaries, newSummary],
      contextMessages: args.remainingMessages,
      messageCount: args.remainingMessages.length,
      lastUpdatedAt: Date.now(),
    });
  },
});
