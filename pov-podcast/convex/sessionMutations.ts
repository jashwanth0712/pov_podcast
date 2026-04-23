/**
 * Internal mutations for persisting dialogue turns, updating persona emotional
 * state, logging deadlock events, and updating round-robin index.
 *
 * Requirements: 3.3, 8.1, 17.1, 21.1
 */

import { internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { validateDialogueTurnDocument } from "./lib/dialogueTurnSerialisation";

/**
 * Persists a dialogue turn to the database.
 *
 * Validates the turn document before inserting (Req 12.4): if any required
 * field is missing, throws a ConvexError with a descriptive message and does
 * NOT persist the incomplete turn.
 *
 * Attaches article references (Req 13.2) and emotional state snapshot (Req 21.1)
 * to the turn record. Sets the qualityWarning flag when applicable (Req 8.6).
 *
 * Updates session lastActivityAt after every turn so no more than one turn of
 * progress is lost in the event of a connection interruption (Req 7.4).
 *
 * Requirements: 7.4, 12.4, 13.2, 21.1
 */
export const persistDialogueTurn = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    speakerId: v.union(v.id("personas"), v.literal("user"), v.literal("moderator")),
    speakerName: v.string(),
    text: v.string(),
    turnIndex: v.number(),
    articleReferences: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        isVerified: v.boolean(),
        isIllustrative: v.boolean(),
        ideologicalAlignment: v.string(),
      })
    ),
    emotionalStateSnapshot: v.optional(
      v.object({
        mood: v.union(
          v.literal("calm"),
          v.literal("frustrated"),
          v.literal("passionate"),
          v.literal("defensive"),
          v.literal("resigned")
        ),
        convictionLevel: v.number(),
        willingnessToConcede: v.number(),
      })
    ),
    qualityWarning: v.boolean(),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
  },
  handler: async (ctx, args) => {
    // Validate the turn document before persisting (Req 12.4).
    // validateDialogueTurnDocument expects the serialised format where
    // speakerId is represented as "personaId".
    const doc: Record<string, unknown> = {
      personaId: args.speakerId,
      turnIndex: args.turnIndex,
      text: args.text,
      audioUrl: null,           // not yet synthesised; field must be present
      timestamp: Date.now(),
    };

    const validationResult = validateDialogueTurnDocument(doc);
    if (!validationResult.success) {
      throw new ConvexError(validationResult.error);
    }

    const now = Date.now();

    // Insert the turn with all required fields including article references
    // (Req 13.2), emotional state snapshot (Req 21.1), and qualityWarning flag.
    const turnId = await ctx.db.insert("dialogueTurns", {
      sessionId: args.sessionId,
      branchId: args.branchId,
      turnIndex: args.turnIndex,
      speakerId: args.speakerId,
      speakerName: args.speakerName,
      text: args.text,
      audioUrl: undefined,
      timestamp: now,
      articleReferences: args.articleReferences,
      emotionalStateSnapshot: args.emotionalStateSnapshot,
      qualityWarning: args.qualityWarning,
      isUserInterruption: false,
      depthLevel: args.depthLevel,
    });

    // Update session lastActivityAt so no more than one turn of progress is
    // lost in the event of a connection interruption (Req 7.4).
    await ctx.db.patch(args.sessionId, { lastActivityAt: now });

    return turnId;
  },
});

/**
 * Updates the emotional state of a persona agent.
 * Requirements: 21.1, 21.4
 */
export const updatePersonaEmotionalState = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
    emotionalState: v.object({
      mood: v.union(
        v.literal("calm"),
        v.literal("frustrated"),
        v.literal("passionate"),
        v.literal("defensive"),
        v.literal("resigned")
      ),
      convictionLevel: v.number(),
      willingnessToConcede: v.number(),
    }),
    newMessage: v.optional(
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

    if (!state) {
      throw new Error(
        `PersonaAgentState not found for persona ${args.personaId} in session ${args.sessionId}`
      );
    }

    const updatedMessages = args.newMessage
      ? [...state.contextMessages, args.newMessage]
      : state.contextMessages;

    await ctx.db.patch(state._id, {
      emotionalState: args.emotionalState,
      contextMessages: updatedMessages,
      messageCount: updatedMessages.length,
      lastUpdatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Logs a deadlock event to the deadlockEvents table.
 * Requirements: 17.1, 17.2
 */
export const logDeadlockEvent = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    detectedAtTurnIndex: v.number(),
    escalationAction: v.union(
      v.literal("moderator_turn"),
      v.literal("topic_nudge")
    ),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("deadlockEvents", {
      sessionId: args.sessionId,
      branchId: args.branchId,
      detectedAtTurnIndex: args.detectedAtTurnIndex,
      escalationAction: args.escalationAction,
      timestamp: Date.now(),
    });

    return eventId;
  },
});

/**
 * Updates the round-robin index for a session.
 * Requirements: 14.3
 */
export const updateRoundRobinIndex = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    nextIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      roundRobinIndex: args.nextIndex,
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Marks a branch as pruned and deletes all associated dialogue turns and
 * persona agent states. The branch record itself is retained (just marked pruned).
 *
 * Requirements: 16.6, 16.7
 */
export const pruneBranch = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.branchId);
    if (!branch || branch.sessionId !== args.sessionId) {
      throw new Error("Branch not found.");
    }

    // Mark the branch as pruned
    await ctx.db.patch(args.branchId, { isPruned: true });

    // Delete all dialogueTurns for this branch
    const turns = await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branchId_turnIndex", (q) => q.eq("branchId", args.branchId))
      .collect();

    for (const turn of turns) {
      await ctx.db.delete(turn._id);
    }

    // Delete all personaAgentStates for this branch
    const states = await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_branchId", (q) =>
        q.eq("sessionId", args.sessionId).eq("branchId", args.branchId)
      )
      .collect();

    for (const state of states) {
      await ctx.db.delete(state._id);
    }

    return { success: true, prunedTurns: turns.length, prunedStates: states.length };
  },
});
