import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const updateScenarioBannerStatus = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    bannerImageUrl: v.optional(v.string()),
    bannerImageStorageId: v.optional(v.id("_storage")),
    bannerGenerationStatus: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const updateFields: Record<string, unknown> = {
      bannerGenerationStatus: args.bannerGenerationStatus,
    };

    if (args.bannerImageUrl !== undefined) {
      updateFields.bannerImageUrl = args.bannerImageUrl;
    }
    if (args.bannerImageStorageId !== undefined) {
      updateFields.bannerImageStorageId = args.bannerImageStorageId;
    }

    await ctx.db.patch(args.scenarioId, updateFields);
  },
});
