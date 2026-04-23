import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const getPendingImageJobs = action({
  args: {},
  handler: async (ctx) => {
    const scenarios = await ctx.runQuery(api.scenarios.getPrebuiltScenarios, { era: undefined });

    const pendingBanners: { scenarioId: string; title: string }[] = [];
    const pendingAvatars: { personaId: string; name: string; scenarioTitle: string }[] = [];

    for (const s of scenarios) {
      if (s.bannerGenerationStatus !== "complete") {
        pendingBanners.push({ scenarioId: s._id, title: s.title });
      }

      const personas = await ctx.runQuery(api.scenarios.getPersonasForScenario, { scenarioId: s._id });
      for (const p of personas) {
        if (p.avatarGenerationStatus !== "complete") {
          pendingAvatars.push({ personaId: p._id, name: p.name, scenarioTitle: s.title });
        }
      }
    }

    return { pendingBanners, pendingAvatars };
  },
});

export const runAllPendingJobs = action({
  args: {},
  handler: async (ctx) => {
    const { pendingBanners, pendingAvatars } = await ctx.runAction(api.imageGeneration.getPendingImageJobs, {});

    const results = {
      banners: { success: 0, failed: 0, errors: [] as string[] },
      avatars: { success: 0, failed: 0, errors: [] as string[] },
    };

    for (const b of pendingBanners) {
      const result = await ctx.runAction(api.generateBanner.generateBanner, {
        scenarioId: b.scenarioId as Id<"scenarios">,
      });
      if (result.success) {
        results.banners.success++;
      } else {
        results.banners.failed++;
        results.banners.errors.push(`${b.title}: ${result.error}`);
      }
    }

    for (const a of pendingAvatars) {
      const result = await ctx.runAction(api.generateAvatars.generateAvatars, {
        personaId: a.personaId as Id<"personas">,
      });
      if (result.success) {
        results.avatars.success++;
      } else {
        results.avatars.failed++;
        results.avatars.errors.push(`${a.name}: ${result.error}`);
      }
    }

    return results;
  },
});
