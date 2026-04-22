import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Update persona avatar fields after generation.
 */
export const updatePersonaAvatarStatus = internalMutation({
  args: {
    personaId: v.id("personas"),
    profileImageUrl: v.optional(v.string()),
    portraitImageUrl: v.optional(v.string()),
    avatarGenerationStatus: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.personaId, {
      profileImageUrl: args.profileImageUrl,
      portraitImageUrl: args.portraitImageUrl,
      avatarGenerationStatus: args.avatarGenerationStatus,
    });
  },
});

/**
 * Schedule a retry for avatar generation with exponential backoff.
 * Backoff schedule: 1 min, 5 min, 30 min (Requirements 22.5)
 */
export const scheduleAvatarRetry = internalMutation({
  args: {
    personaId: v.id("personas"),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const backoffMs = [
      1 * 60 * 1000,   // 1 minute
      5 * 60 * 1000,   // 5 minutes
      30 * 60 * 1000,  // 30 minutes
    ];

    if (args.attemptNumber >= backoffMs.length) {
      // Max retries exhausted — leave status as "failed"
      return;
    }

    const delayMs = backoffMs[args.attemptNumber];
    await ctx.scheduler.runAfter(delayMs, api.generateAvatars.retryGenerateAvatars, {
      personaId: args.personaId,
      attemptNumber: args.attemptNumber + 1,
    });
  },
});
