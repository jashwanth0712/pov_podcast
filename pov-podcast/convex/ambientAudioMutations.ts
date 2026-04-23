import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const updateScenarioMusicStatus = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    musicStorageId: v.optional(v.id("_storage")),
    musicGeneratedAt: v.optional(v.number()),
    musicMoodLabel: v.optional(v.string()),
    musicGenerationPrompt: v.optional(v.string()),
    musicGenerationStatus: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const updateFields: Record<string, unknown> = {
      musicGenerationStatus: args.musicGenerationStatus,
    };
    if (args.musicStorageId !== undefined) {
      updateFields.musicStorageId = args.musicStorageId;
    }
    if (args.musicGeneratedAt !== undefined) {
      updateFields.musicGeneratedAt = args.musicGeneratedAt;
    }
    if (args.musicMoodLabel !== undefined) {
      updateFields.musicMoodLabel = args.musicMoodLabel;
    }
    if (args.musicGenerationPrompt !== undefined) {
      updateFields.musicGenerationPrompt = args.musicGenerationPrompt;
    }
    await ctx.db.patch(args.scenarioId, updateFields);
  },
});

export const updatePersonaSfxStatus = internalMutation({
  args: {
    personaId: v.id("personas"),
    sfxStorageId: v.optional(v.id("_storage")),
    sfxGeneratedAt: v.optional(v.number()),
    sfxGenerationPrompt: v.optional(v.string()),
    sfxGenerationStatus: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const updateFields: Record<string, unknown> = {
      sfxGenerationStatus: args.sfxGenerationStatus,
    };
    if (args.sfxStorageId !== undefined) {
      updateFields.sfxStorageId = args.sfxStorageId;
    }
    if (args.sfxGeneratedAt !== undefined) {
      updateFields.sfxGeneratedAt = args.sfxGeneratedAt;
    }
    if (args.sfxGenerationPrompt !== undefined) {
      updateFields.sfxGenerationPrompt = args.sfxGenerationPrompt;
    }
    await ctx.db.patch(args.personaId, updateFields);
  },
});
