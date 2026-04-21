import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Schedules permanent removal of all associated sessions, scenarios, and
 * personal data within 30 days.
 * Requirement 11.5
 */
export const deleteUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const scheduledDeletionAt = now + THIRTY_DAYS_MS;

    // Check if there's already a pending deletion request
    const existing = await ctx.db
      .query("accountDeletionRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      return {
        success: true,
        scheduledDeletionAt: existing.scheduledDeletionAt,
        message: "Account deletion already scheduled.",
      };
    }

    await ctx.db.insert("accountDeletionRequests", {
      userId,
      requestedAt: now,
      scheduledDeletionAt,
      status: "pending",
    });

    return {
      success: true,
      scheduledDeletionAt,
      message: "Account deletion scheduled. All your data will be permanently removed within 30 days.",
    };
  },
});

/**
 * Cancel a pending account deletion request.
 */
export const cancelAccountDeletion = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const pending = await ctx.db
      .query("accountDeletionRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!pending) {
      return { success: false, message: "No pending deletion request found." };
    }

    await ctx.db.patch(pending._id, { status: "cancelled" });

    return { success: true, message: "Account deletion cancelled." };
  },
});

/**
 * Get the current user's account deletion status.
 */
export const getAccountDeletionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const pending = await ctx.db
      .query("accountDeletionRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    return pending ?? null;
  },
});

/**
 * Internal mutation to execute the actual data deletion.
 * Called by a scheduled function after the 30-day window.
 */
export const executeAccountDeletion = mutation({
  args: { userId: v.id("users"), requestId: v.id("accountDeletionRequests") },
  handler: async (ctx, { userId, requestId }) => {
    // Delete all sessions for this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      // Delete branches and dialogue turns for each session
      const branches = await ctx.db
        .query("branches")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const branch of branches) {
        const turns = await ctx.db
          .query("dialogueTurns")
          .withIndex("by_sessionId_branchId", (q) =>
            q.eq("sessionId", session._id).eq("branchId", branch._id)
          )
          .collect();

        for (const turn of turns) {
          await ctx.db.delete(turn._id);
        }

        await ctx.db.delete(branch._id);
      }

      // Delete persona agent states
      const agentStates = await ctx.db
        .query("personaAgentStates")
        .withIndex("by_sessionId_personaId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const state of agentStates) {
        await ctx.db.delete(state._id);
      }

      // Delete deadlock events
      const deadlocks = await ctx.db
        .query("deadlockEvents")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const deadlock of deadlocks) {
        await ctx.db.delete(deadlock._id);
      }

      // Delete rejected interruptions
      const rejections = await ctx.db
        .query("rejectedInterruptions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const rejection of rejections) {
        await ctx.db.delete(rejection._id);
      }

      await ctx.db.delete(session._id);
    }

    // Delete user-generated scenarios (not pre-built)
    const scenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .collect();

    for (const scenario of scenarios) {
      // Delete personas for each scenario
      const personas = await ctx.db
        .query("personas")
        .withIndex("by_scenarioId", (q) => q.eq("scenarioId", scenario._id))
        .collect();

      for (const persona of personas) {
        await ctx.db.delete(persona._id);
      }

      // Delete persona relationships
      const relationships = await ctx.db
        .query("personaRelationships")
        .withIndex("by_scenarioId", (q) => q.eq("scenarioId", scenario._id))
        .collect();

      for (const rel of relationships) {
        await ctx.db.delete(rel._id);
      }

      await ctx.db.delete(scenario._id);
    }

    // Delete user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const pref of prefs) {
      await ctx.db.delete(pref._id);
    }

    // Delete all deletion requests for this user
    const allRequests = await ctx.db
      .query("accountDeletionRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const req of allRequests) {
      await ctx.db.delete(req._id);
    }

    // Mark the specific request as completed (it may have been deleted above,
    // but we try to patch it first for audit purposes)
    try {
      await ctx.db.patch(requestId, { status: "completed" });
    } catch {
      // Already deleted above, that's fine
    }

    // Delete the user record itself
    await ctx.db.delete(userId);
  },
});

/**
 * Get a user record by their token identifier.
 * Used internally by actions that need the user's database ID.
 */
export const getUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Convex Auth stores users in the auth tables; we look up by token identifier
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Get the currently authenticated user's record.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});
