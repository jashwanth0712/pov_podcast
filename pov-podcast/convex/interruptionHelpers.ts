import { internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const querySessionForInterruption = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

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
    if (!parentBranchId) throw new ConvexError("Session has no active branch.");

    const newBranchId = await ctx.db.insert("branches", {
      sessionId: args.sessionId,
      parentBranchId,
      forkPointTurnIndex: args.forkPointTurnIndex,
      forkPointTurnId: undefined,
      createdAt: now,
      lastNavigatedAt: now,
      isPruned: false,
    });

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

    await ctx.db.patch(args.sessionId, {
      activeBranchId: args.branchId,
      lastActivityAt: now,
    });

    return turnId;
  },
});
