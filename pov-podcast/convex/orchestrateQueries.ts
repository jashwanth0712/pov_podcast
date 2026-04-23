import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const querySessionForOrchestration = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const scenario = await ctx.db.get(session.scenarioId);
    return session ? { ...session, personaIds: scenario?.personaIds ?? [] } : null;
  },
});

export const queryPersonaStatesForOrchestration = internalQuery({
  args: { sessionId: v.id("sessions"), branchId: v.id("branches") },
  handler: async (ctx, args) => {
    const states = await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_branchId", (q) =>
        q.eq("sessionId", args.sessionId).eq("branchId", args.branchId)
      )
      .collect();

    const statesWithPersona = await Promise.all(
      states.map(async (state) => {
        const persona = await ctx.db.get(state.personaId);
        return {
          ...state,
          ideologicalPosition: persona?.ideologicalPosition ?? "",
          personaName: persona?.name ?? "Unknown",
        };
      })
    );

    return statesWithPersona;
  },
});

export const queryRecentTurnsForOrchestration = internalQuery({
  args: { branchId: v.id("branches"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branchId_turnIndex", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(args.limit);
  },
});

export const queryRelationshipsForOrchestration = internalQuery({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personaRelationships")
      .withIndex("by_scenarioId", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
  },
});
