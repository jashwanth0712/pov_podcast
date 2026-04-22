import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Persist a generated scenario and its personas to Convex.
 * Called internally by generateScenario action.
 * Requirements: 2.4
 */
export const persistGeneratedScenario = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    timePeriod: v.string(),
    era: v.union(
      v.literal("Ancient"),
      v.literal("Medieval"),
      v.literal("Modern"),
      v.literal("Contemporary")
    ),
    description: v.string(),
    initialDialogueOutline: v.string(),
    personas: v.array(
      v.object({
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
        articleReferences: v.array(
          v.object({
            url: v.string(),
            title: v.string(),
            isVerified: v.boolean(),
            isIllustrative: v.boolean(),
            ideologicalAlignment: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const scenarioId = await ctx.db.insert("scenarios", {
      title: args.title,
      timePeriod: args.timePeriod,
      era: args.era,
      description: args.description.slice(0, 200),
      isPrebuilt: false,
      createdBy: args.userId,
      createdAt: now,
      personaIds: [],
      initialDialogueOutline: args.initialDialogueOutline,
      contentDisclaimer:
        "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.",
      bannerGenerationStatus: "pending",
    });

    const personaIds = [];
    for (const persona of args.personas) {
      const personaId = await ctx.db.insert("personas", {
        scenarioId,
        name: persona.name,
        historicalRole: persona.historicalRole,
        personalityTraits: persona.personalityTraits,
        emotionalBackstory: persona.emotionalBackstory,
        speakingStyle: persona.speakingStyle,
        ideologicalPosition: persona.ideologicalPosition,
        geographicOrigin: persona.geographicOrigin,
        estimatedAge: persona.estimatedAge,
        gender: persona.gender,
        voiceId: persona.voiceId,
        articleReferences: persona.articleReferences,
        profileImageUrl: undefined,
        profileImageStorageId: undefined,
        avatarGenerationStatus: "pending",
      });
      personaIds.push(personaId);
    }

    await ctx.db.patch(scenarioId, { personaIds });

    return { scenarioId, personaIds };
  },
});
