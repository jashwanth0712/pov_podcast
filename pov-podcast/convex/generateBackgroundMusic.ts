"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buildEmotionalToneProfile } from "./lib/ambientAudioPrompts";
import { isCacheStale } from "./lib/ambientAudioCache";

const MUSIC_TIMEOUT_MS = 15000;
const MUSIC_LENGTH_MS = 60000;

async function readStreamToBlob(
  stream: ReadableStream<Uint8Array>
): Promise<Blob> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

async function composeMusic(
  client: ElevenLabsClient,
  prompt: string,
  timeoutMs: number
): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const stream = await client.music.compose(
      { prompt, musicLengthMs: MUSIC_LENGTH_MS },
      { abortSignal: controller.signal }
    );
    return await readStreamToBlob(stream as unknown as ReadableStream<Uint8Array>);
  } finally {
    clearTimeout(timeout);
  }
}

export const generateBackgroundMusic = action({
  args: {
    scenarioId: v.id("scenarios"),
    moodLabel: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; storageId?: Id<"_storage">; error?: string }> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.ambientAudioMutations.updateScenarioMusicStatus, {
        scenarioId: args.scenarioId,
        musicGenerationStatus: "failed",
      });
      return { success: false, error: "ELEVENLABS_API_KEY not configured." };
    }

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: args.scenarioId,
    });
    if (!scenario) return { success: false, error: "Scenario not found." };

    // Idempotency: skip when already pending.
    if (scenario.musicGenerationStatus === "pending") {
      return { success: false, error: "Music generation already in progress." };
    }

    // Reuse cache when complete and not stale.
    if (
      scenario.musicGenerationStatus === "complete" &&
      scenario.musicStorageId &&
      scenario.musicGeneratedAt &&
      !isCacheStale(scenario.musicGeneratedAt, Date.now())
    ) {
      return { success: true, storageId: scenario.musicStorageId };
    }

    await ctx.runMutation(internal.ambientAudioMutations.updateScenarioMusicStatus, {
      scenarioId: args.scenarioId,
      musicGenerationStatus: "pending",
    });

    const client = new ElevenLabsClient({ apiKey });
    const primaryPrompt = buildEmotionalToneProfile({
      title: scenario.title,
      era: scenario.era,
      timePeriod: scenario.timePeriod,
      description: scenario.description,
      initialDialogueOutline: scenario.initialDialogueOutline,
      dominantMood: args.moodLabel,
    });

    let audioBlob: Blob;
    let usedPrompt = primaryPrompt;
    try {
      audioBlob = await composeMusic(client, primaryPrompt, MUSIC_TIMEOUT_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isBadPrompt = /bad_prompt|unprocessable|422/i.test(msg);
      if (isBadPrompt) {
        // Retry once with a simplified era+timePeriod-only prompt.
        const simplified = `Ambient atmospheric music for the ${scenario.era} era, ${scenario.timePeriod}. Non-melodic, understated, supporting spoken word.`;
        try {
          audioBlob = await composeMusic(client, simplified, MUSIC_TIMEOUT_MS);
          usedPrompt = simplified;
        } catch (retryErr) {
          await ctx.runMutation(
            internal.ambientAudioMutations.updateScenarioMusicStatus,
            {
              scenarioId: args.scenarioId,
              musicGenerationStatus: "failed",
              musicGenerationPrompt: simplified,
            }
          );
          return {
            success: false,
            error: `Music generation retry failed: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
          };
        }
      } else {
        await ctx.runMutation(
          internal.ambientAudioMutations.updateScenarioMusicStatus,
          {
            scenarioId: args.scenarioId,
            musicGenerationStatus: "failed",
            musicGenerationPrompt: primaryPrompt,
          }
        );
        return { success: false, error: `Music generation failed: ${msg}` };
      }
    }

    const storageId = await ctx.storage.store(audioBlob);

    await ctx.runMutation(internal.ambientAudioMutations.updateScenarioMusicStatus, {
      scenarioId: args.scenarioId,
      musicStorageId: storageId,
      musicGeneratedAt: Date.now(),
      musicMoodLabel: args.moodLabel,
      musicGenerationPrompt: usedPrompt,
      musicGenerationStatus: "complete",
    });

    return { success: true, storageId };
  },
});
