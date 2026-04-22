import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update article reference verification status for a persona.
 */
export const updateArticleVerification = internalMutation({
  args: {
    personaId: v.id("personas"),
    articleReferences: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        isVerified: v.boolean(),
        isIllustrative: v.boolean(),
        ideologicalAlignment: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.personaId, {
      articleReferences: args.articleReferences,
    });
  },
});
