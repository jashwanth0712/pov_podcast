import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all persona relationships for a given scenario.
 * Used by the relationship map view and orchestrator relevance scoring.
 * Requirements: 20.1, 20.4
 */
export const getRelationshipsForScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("personaRelationships")
      .withIndex("by_scenarioId", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();

    return relationships;
  },
});

/**
 * Returns the relationship between two specific personas (if any).
 * Used by the orchestrator when applying relationship tone modifiers.
 * Requirements: 20.2, 20.5
 */
export const getRelationshipBetween = query({
  args: {
    scenarioId: v.id("scenarios"),
    personaAId: v.id("personas"),
    personaBId: v.id("personas"),
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("personaRelationships")
      .withIndex("by_scenarioId", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();

    // Check both orderings since relationships are bidirectional
    return (
      relationships.find(
        (r) =>
          (r.personaAId === args.personaAId && r.personaBId === args.personaBId) ||
          (r.personaAId === args.personaBId && r.personaBId === args.personaAId)
      ) ?? null
    );
  },
});
