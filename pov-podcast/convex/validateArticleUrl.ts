"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * validateArticleUrl action.
 *
 * HEAD-requests a URL to check reachability.
 * Returns isVerified: false if unreachable.
 *
 * Requirements: 13.7, 13.8
 */
export const validateArticleUrl = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string; isReachable: boolean }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(args.url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      return {
        url: args.url,
        isReachable: response.ok || response.status === 405, // 405 = Method Not Allowed (HEAD not supported but URL exists)
      };
    } catch {
      return { url: args.url, isReachable: false };
    }
  },
});

/**
 * Validate all article URLs for all personas in a scenario.
 * Flags unreachable URLs as isVerified: false.
 * Labels article references as isIllustrative: true for fictional/speculative scenarios.
 *
 * Requirements: 13.7, 13.8
 */
export const validateScenarioArticles = action({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Load scenario to check if it's speculative
    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: args.scenarioId,
    });

    if (!scenario) {
      return { success: false };
    }

    // Load all personas for this scenario
    const personas = await ctx.runQuery(api.scenarios.getPersonasForScenario, {
      scenarioId: args.scenarioId,
    });

    for (const persona of personas) {
      if (!persona.articleReferences || persona.articleReferences.length === 0) {
        continue;
      }

      // Validate each article URL
      const updatedRefs = await Promise.all(
        persona.articleReferences.map(async (ref) => {
          let isVerified = ref.isVerified;

          // Only validate if not already verified
          if (!isVerified) {
            try {
              const result = await ctx.runAction(api.validateArticleUrl.validateArticleUrl, {
                url: ref.url,
              });
              isVerified = result.isReachable;
            } catch {
              isVerified = false;
            }
          }

          return {
            ...ref,
            isVerified,
            // Label as illustrative for non-prebuilt (user-generated) scenarios
            // that may contain speculative content (Requirement 13.7)
            isIllustrative: !scenario.isPrebuilt ? ref.isIllustrative : false,
          };
        })
      );

      // Update persona with verified article references
      await ctx.runMutation(internal.articleMutations.updateArticleVerification, {
        personaId: persona._id,
        articleReferences: updatedRefs,
      });
    }

    return { success: true };
  },
});
