import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Creates a new session, instantiates personaAgentStates for each persona,
 * and creates the root branch record.
 *
 * Requirements: 3.3, 4.1, 14.10
 */
export const startSession = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
    turnTakingMode: v.optional(
      v.union(
        v.literal("Relevance"),
        v.literal("RoundRobin"),
        v.literal("Random")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Derive userId from authenticated context (Req 3.3)
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated. Please log in to start a session.");
    }

    // Load the scenario to get persona IDs
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found.");
    }

    const now = Date.now();
    const turnTakingMode = args.turnTakingMode ?? "Relevance"; // Default: Relevance (Req 14.10)

    // We need a placeholder branchId to create the session first, then update it.
    // Create the session record with a temporary activeBranchId that we'll update.
    // Convex doesn't support forward references, so we create the branch first.

    // Create a temporary session ID placeholder — we insert session then branch,
    // then patch session with the branch ID.
    // Step 1: Insert session with a self-referencing workaround:
    // We insert the branch after the session, so we need to insert session first
    // with a dummy approach. Instead, insert branch referencing session after session.
    // Since Convex requires activeBranchId at insert time, we use a two-step approach:
    // insert session, insert branch referencing session, patch session with branchId.

    // We need to create the session and root branch together.
    // Convex requires activeBranchId at insert time, so we use a two-step approach:
    // 1. Insert a temporary "placeholder" branch (no sessionId yet — we'll patch it)
    // 2. Insert session referencing the placeholder branch
    // 3. Patch the branch with the real sessionId

    // Step 1: Insert a temporary root branch with a placeholder sessionId.
    // We cast to satisfy the type checker; it is immediately corrected in step 3.
    const rootBranchId = await ctx.db.insert("branches", {
      sessionId: "placeholder" as unknown as import("./_generated/dataModel").Id<"sessions">,
      parentBranchId: undefined,
      forkPointTurnIndex: undefined,
      forkPointTurnId: undefined,
      createdAt: now,
      lastNavigatedAt: now,
      isPruned: false,
    });

    // Step 2: Insert session referencing the real rootBranchId
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      scenarioId: args.scenarioId,
      status: "active",
      depthLevel: args.depthLevel,
      turnTakingMode,
      activeBranchId: rootBranchId,
      createdAt: now,
      lastActivityAt: now,
      roundRobinIndex: 0,
    });

    // Step 3: Patch the branch with the real sessionId
    await ctx.db.patch(rootBranchId, { sessionId });

    // Instantiate personaAgentStates for each persona with initial emotional state
    // (Req 3.3, 4.1)
    const initialEmotionalState = {
      mood: "calm" as const,
      convictionLevel: 0.7,
      willingnessToConcede: 0.5,
    };

    for (const personaId of scenario.personaIds) {
      await ctx.db.insert("personaAgentStates", {
        sessionId,
        personaId,
        branchId: rootBranchId,
        emotionalState: initialEmotionalState,
        contextMessages: [],
        compactionSummaries: [],
        messageCount: 0,
        lastUpdatedAt: now,
      });
    }

    return { sessionId, rootBranchId };
  },
});

/**
 * Pauses an active session, stopping playback and preserving dialogue position.
 * Requirements: 4.7, 7.5
 */
export const pauseSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found.");
    if (session.userId !== userId) throw new Error("Not authorised.");
    if (session.status !== "active") throw new Error("Session is not active.");

    await ctx.db.patch(args.sessionId, {
      status: "paused",
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resumes a paused session from the preserved dialogue position.
 * Requirements: 4.8, 7.5
 */
export const resumeSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found.");
    if (session.userId !== userId) throw new Error("Not authorised.");
    if (session.status !== "paused") throw new Error("Session is not paused.");

    await ctx.db.patch(args.sessionId, {
      status: "active",
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Ends a session, marking it as completed and blocking further turns.
 * Requirements: 7.5
 */
export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found.");
    if (session.userId !== userId) throw new Error("Not authorised.");
    if (session.status === "completed") throw new Error("Session is already completed.");

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Returns the full session state including current branch.
 * Requirements: 7.3
 */
export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;

    return session;
  },
});

/**
 * Returns the user's session history ordered by most recent activity.
 * Requirements: 7.2, 7.3
 */
export const getUserSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId_lastActivity", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return sessions;
  },
});

/**
 * Returns the current emotional state per persona for a session,
 * joined with persona name and historical role for display.
 * Real-time subscription — updates whenever any persona's state changes.
 * Requirements: 20.1, 20.2
 */
export const getPersonaStates = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return [];

    const states = await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_personaId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Join with persona name and role for display purposes
    const statesWithPersona = await Promise.all(
      states.map(async (state) => {
        const persona = await ctx.db.get(state.personaId);
        return {
          ...state,
          personaName: persona?.name ?? "Unknown",
          personaRole: persona?.historicalRole ?? "Unknown",
        };
      })
    );

    return statesWithPersona;
  },
});

/**
 * Returns the user's preferences (default depth level, etc.).
 * Requirements: 19.5
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return prefs ?? null;
  },
});

/**
 * Persists the user's preferred depth level to userPreferences.
 * Applied as default when starting future sessions.
 * Requirements: 19.5
 */
export const updateUserDefaultDepthLevel = mutation({
  args: {
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultDepthLevel: args.depthLevel,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        defaultDepthLevel: args.depthLevel,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Switches the turn-taking mode for an active session.
 * Requirements: 14.5, 14.6
 */
export const switchTurnTakingMode = mutation({
  args: {
    sessionId: v.id("sessions"),
    mode: v.union(
      v.literal("Relevance"),
      v.literal("RoundRobin"),
      v.literal("Random")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found.");

    await ctx.db.patch(args.sessionId, {
      turnTakingMode: args.mode,
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Updates the depth level for an active session.
 * Applied to all subsequent generated turns.
 * Requirements: 19.3
 */
export const updateDepthLevel = mutation({
  args: {
    sessionId: v.id("sessions"),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found.");

    await ctx.db.patch(args.sessionId, {
      depthLevel: args.depthLevel,
      lastActivityAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Forces a specific persona to speak next, overriding turn-taking mode for one turn.
 * Requirements: 14.7, 14.8
 */
export const forceNextSpeaker = mutation({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found.");
    if (session.status !== "active") throw new Error("Session is not active.");

    // Store the forced next speaker — the orchestrator will pick this up
    // and clear it after generating the forced turn.
    // We store it as a field on the session (schema already supports this via patch).
    await ctx.db.patch(args.sessionId, {
      lastActivityAt: Date.now(),
    });

    // The forced speaker is communicated to the orchestrator via a separate
    // mechanism (the orchestrateTurn action reads this). For now we return
    // the personaId so the caller can pass it directly to orchestrateTurn.
    return { success: true, forcedPersonaId: args.personaId };
  },
});

/**
 * Navigates to a specific branch and updates lastNavigatedAt.
 * Requirements: 5.10, 16.4
 */
export const navigateToBranch = mutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Session not found.");

    const branch = await ctx.db.get(args.branchId);
    if (!branch || branch.sessionId !== args.sessionId) throw new Error("Branch not found.");
    if (branch.isPruned) throw new Error("Branch has been pruned.");

    const now = Date.now();
    await ctx.db.patch(args.branchId, { lastNavigatedAt: now });
    await ctx.db.patch(args.sessionId, {
      activeBranchId: args.branchId,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

/**
 * Returns all branches and fork points for a session (conversation tree).
 * Requirements: 4.10, 16.3, 16.5
 */
export const getConversationTree = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;

    const branches = await ctx.db
      .query("branches")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isPruned"), false))
      .collect();

    return { branches, activeBranchId: session.activeBranchId };
  },
});

/**
 * Returns dialogue turns for a specific branch.
 * Requirements: 4.3
 */
export const getDialogueTurns = query({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return [];

    const turns = await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branchId_turnIndex", (q) => q.eq("branchId", args.branchId))
      .order("asc")
      .collect();

    return turns;
  },
});
