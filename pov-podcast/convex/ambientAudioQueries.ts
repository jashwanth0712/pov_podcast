import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Returns signed URLs for a scenario's background music and each persona's
 * character SFX in a single round trip.
 *
 * Returns `null` for any entity without a cached file (never-generated,
 * pending, failed, or storage-miss).
 *
 * Requirements: 4.3, 4.5, 7.3
 */
export const getAmbientAudioUrls = query({
  args: {
    scenarioId: v.id("scenarios"),
    personaIds: v.array(v.id("personas")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    musicUrl: string | null;
    musicStorageId: string | null;
    sfxUrls: Record<string, string | null>;
    sfxStorageIds: Record<string, string | null>;
  }> => {
    const scenario = await ctx.db.get(args.scenarioId);

    const hasMusic =
      !!scenario?.musicStorageId &&
      scenario.musicGenerationStatus === "complete";
    const musicUrl = hasMusic
      ? await ctx.storage.getUrl(scenario!.musicStorageId!)
      : null;
    const musicStorageId = hasMusic
      ? (scenario!.musicStorageId! as unknown as string)
      : null;

    const sfxUrls: Record<string, string | null> = {};
    const sfxStorageIds: Record<string, string | null> = {};
    for (const personaId of args.personaIds) {
      const persona = await ctx.db.get(personaId);
      const key = personaId as Id<"personas">;
      if (
        persona?.sfxStorageId &&
        persona.sfxGenerationStatus === "complete"
      ) {
        sfxUrls[key] = await ctx.storage.getUrl(persona.sfxStorageId);
        sfxStorageIds[key] = persona.sfxStorageId as unknown as string;
      } else {
        sfxUrls[key] = null;
        sfxStorageIds[key] = null;
      }
    }

    return { musicUrl, musicStorageId, sfxUrls, sfxStorageIds };
  },
});
