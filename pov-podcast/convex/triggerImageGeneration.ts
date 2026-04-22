import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * One-time action to trigger image generation for all pre-built scenarios.
 * Run this via the Convex dashboard or CLI to generate avatars and banners.
 */
export const generateAllPrebuiltImages = action({
  args: {},
  handler: async (ctx): Promise<{
    scenariosProcessed: number;
    personasProcessed: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let scenariosProcessed = 0;
    let personasProcessed = 0;

    // Get all pre-built scenarios
    const scenarios = await ctx.runQuery(api.scenarios.getPrebuiltScenarios, { era: undefined });

    for (const scenario of scenarios) {
      // Trigger banner generation if not already complete
      if (scenario.bannerGenerationStatus !== "complete") {
        try {
          await ctx.scheduler.runAfter(0, api.generateBanner.generateBanner, {
            scenarioId: scenario._id,
          });
          scenariosProcessed++;
        } catch (err) {
          errors.push(`Banner for ${scenario.title}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Get personas for this scenario
      const personas = await ctx.runQuery(api.scenarios.getPersonasForScenario, {
        scenarioId: scenario._id,
      });

      for (const persona of personas) {
        // Trigger avatar generation if not already complete
        if (persona.avatarGenerationStatus !== "complete") {
          try {
            await ctx.scheduler.runAfter(0, api.generateAvatars.generateAvatars, {
              personaId: persona._id,
            });
            personasProcessed++;
          } catch (err) {
            errors.push(`Avatar for ${persona.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    return { scenariosProcessed, personasProcessed, errors };
  },
});
