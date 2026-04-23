import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { isCacheStale } from "./lib/ambientAudioCache";

/**
 * Idempotently ensures the scenario and its personas have ambient audio
 * generated. Schedules generation for anything missing, failed, or stale
 * (>90 days old). Safe to call on every session load — the generation
 * actions themselves short-circuit when `status === "pending"` or when
 * `status === "complete"` and the cache is fresh.
 *
 * Requirements: 4.4, 4.5, 7.4
 */
export const ensureAmbientAudio = action({
  args: {
    scenarioId: v.id("scenarios"),
    personaIds: v.array(v.id("personas")),
  },
  handler: async (ctx, args): Promise<{ scheduled: { music: boolean; sfx: number } }> => {
    const now = Date.now();
    let musicScheduled = false;
    let sfxScheduled = 0;

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: args.scenarioId,
    });
    if (!scenario) return { scheduled: { music: false, sfx: 0 } };

    // Schedule music if: never generated, failed, or complete-but-stale.
    const musicNeedsGen =
      !scenario.musicStorageId ||
      scenario.musicGenerationStatus === "failed" ||
      (scenario.musicGenerationStatus === "complete" &&
        scenario.musicGeneratedAt !== undefined &&
        isCacheStale(scenario.musicGeneratedAt, now));
    const musicIsPending = scenario.musicGenerationStatus === "pending";

    if (musicNeedsGen && !musicIsPending) {
      await ctx.scheduler.runAfter(
        0,
        api.generateBackgroundMusic.generateBackgroundMusic,
        { scenarioId: args.scenarioId }
      );
      musicScheduled = true;
    }

    // Per-persona SFX.
    for (const personaId of args.personaIds) {
      const persona = await ctx.runQuery(api.scenarios.getPersonaById, {
        personaId,
      });
      if (!persona) continue;

      const sfxNeedsGen =
        !persona.sfxStorageId ||
        persona.sfxGenerationStatus === "failed" ||
        (persona.sfxGenerationStatus === "complete" &&
          persona.sfxGeneratedAt !== undefined &&
          isCacheStale(persona.sfxGeneratedAt, now));
      const sfxIsPending = persona.sfxGenerationStatus === "pending";

      if (sfxNeedsGen && !sfxIsPending) {
        await ctx.scheduler.runAfter(
          0,
          api.generateCharacterSoundEffect.generateCharacterSoundEffect,
          { personaId }
        );
        sfxScheduled++;
      }
    }

    return { scheduled: { music: musicScheduled, sfx: sfxScheduled } };
  },
});
