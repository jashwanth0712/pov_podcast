import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all scenarios, optionally filtered by era.
 * Requirements: 1.5, 1.6
 */
export const getScenarios = query({
  args: {
    era: v.optional(
      v.union(
        v.literal("Ancient"),
        v.literal("Medieval"),
        v.literal("Modern"),
        v.literal("Contemporary")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.era) {
      return await ctx.db
        .query("scenarios")
        .withIndex("by_era", (q) => q.eq("era", args.era!))
        .collect();
    }
    return await ctx.db.query("scenarios").collect();
  },
});

/**
 * Returns only pre-built scenarios, optionally filtered by era.
 */
export const getPrebuiltScenarios = query({
  args: {
    era: v.optional(
      v.union(
        v.literal("Ancient"),
        v.literal("Medieval"),
        v.literal("Modern"),
        v.literal("Contemporary")
      )
    ),
  },
  handler: async (ctx, args) => {
    let scenarios;
    if (args.era) {
      scenarios = await ctx.db
        .query("scenarios")
        .withIndex("by_era", (q) => q.eq("era", args.era!))
        .collect();
    } else {
      scenarios = await ctx.db.query("scenarios").collect();
    }
    return scenarios.filter((s) => s.isPrebuilt);
  },
});

/**
 * Returns user-generated scenarios for the authenticated user.
 */
export const getUserScenarios = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // Look up the user record
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();
    if (!user) {
      return [];
    }
    return await ctx.db
      .query("scenarios")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", user._id))
      .collect();
  },
});

/**
 * Returns personas for a given scenario.
 */
export const getPersonasForScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personas")
      .withIndex("by_scenarioId", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();
  },
});

/**
 * Returns a single persona by ID.
 */
export const getPersonaById = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personaId);
  },
});

/**
 * Returns a single scenario by ID.
 */
export const getScenarioById = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scenarioId);
  },
});

/**
 * Updates a persona's fields.
 * Requirements: 2.7
 */
export const updatePersona = mutation({
  args: {
    personaId: v.id("personas"),
    name: v.optional(v.string()),
    historicalRole: v.optional(v.string()),
    personalityTraits: v.optional(v.array(v.string())),
    emotionalBackstory: v.optional(v.string()),
    speakingStyle: v.optional(v.string()),
    ideologicalPosition: v.optional(v.string()),
    voiceId: v.optional(v.string()),
    geographicOrigin: v.optional(v.string()),
    estimatedAge: v.optional(v.number()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { personaId, ...fields } = args;
    // Remove undefined fields
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(personaId, updates);
    return { success: true };
  },
});

/**
 * Deletes a persona from a scenario.
 * Enforces minimum of 2 personas remaining.
 * Requirements: 2.7
 */
export const deletePersona = mutation({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    const persona = await ctx.db.get(args.personaId);
    if (!persona) {
      throw new Error("Persona not found.");
    }

    // Check minimum persona count
    const scenario = await ctx.db.get(persona.scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found.");
    }

    if (scenario.personaIds.length <= 2) {
      throw new Error("Cannot delete persona: a scenario must have at least 2 personas.");
    }

    // Remove from scenario's personaIds array
    const updatedPersonaIds = scenario.personaIds.filter((id) => id !== args.personaId);
    await ctx.db.patch(persona.scenarioId, { personaIds: updatedPersonaIds });

    // Delete the persona record
    await ctx.db.delete(args.personaId);

    return { success: true };
  },
});

/**
 * Adds a new persona to an existing scenario.
 * Enforces maximum of 6 personas.
 * Requirements: 2.7
 */
export const addPersona = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    name: v.string(),
    historicalRole: v.string(),
    personalityTraits: v.array(v.string()),
    emotionalBackstory: v.string(),
    speakingStyle: v.string(),
    ideologicalPosition: v.string(),
    geographicOrigin: v.string(),
    estimatedAge: v.number(),
    gender: v.string(),
    voiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found.");
    }

    if (scenario.personaIds.length >= 6) {
      throw new Error("Cannot add persona: a scenario can have a maximum of 6 personas.");
    }

    const personaId = await ctx.db.insert("personas", {
      scenarioId: args.scenarioId,
      name: args.name,
      historicalRole: args.historicalRole,
      personalityTraits: args.personalityTraits,
      emotionalBackstory: args.emotionalBackstory,
      speakingStyle: args.speakingStyle,
      ideologicalPosition: args.ideologicalPosition,
      geographicOrigin: args.geographicOrigin,
      estimatedAge: args.estimatedAge,
      gender: args.gender,
      voiceId: args.voiceId,
      articleReferences: [],
      profileImageUrl: undefined,
      portraitImageUrl: undefined,
      avatarGenerationStatus: "pending",
    });

    // Update scenario's personaIds
    await ctx.db.patch(args.scenarioId, {
      personaIds: [...scenario.personaIds, personaId],
    });

    return { success: true, personaId };
  },
});
