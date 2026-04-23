import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const querySession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const queryPersona = internalQuery({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personaId);
  },
});

export const queryAgentState = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personaAgentStates")
      .withIndex("by_sessionId_personaId", (q) =>
        q.eq("sessionId", args.sessionId).eq("personaId", args.personaId)
      )
      .filter((q) => q.eq(q.field("branchId"), args.branchId))
      .first();
  },
});

export const queryRecentTurns = internalQuery({
  args: { branchId: v.id("branches"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branchId_turnIndex", (q) => q.eq("branchId", args.branchId))
      .order("asc")
      .collect();
  },
});

export const queryRelationships = internalQuery({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personaRelationships")
      .withIndex("by_scenarioId", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
  },
});

export const queryScenarioPersonaIds = internalQuery({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const scenario = await ctx.db.get(args.scenarioId);
    return scenario?.personaIds ?? [];
  },
});

export const queryScenarioTitle = internalQuery({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const scenario = await ctx.db.get(args.scenarioId);
    return scenario?.title ?? "";
  },
});
