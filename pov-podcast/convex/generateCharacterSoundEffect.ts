"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buildSoundEffectPrompt } from "./lib/ambientAudioPrompts";
import { isCacheStale } from "./lib/ambientAudioCache";

const SFX_TIMEOUT_MS = 10000;
const SFX_DURATION_SECONDS = 10;

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

async function generateSfx(
  client: ElevenLabsClient,
  text: string,
  timeoutMs: number
): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const stream = await client.textToSoundEffects.convert(
      { text, durationSeconds: SFX_DURATION_SECONDS, loop: true },
      { abortSignal: controller.signal }
    );
    return await readStreamToBlob(stream as unknown as ReadableStream<Uint8Array>);
  } finally {
    clearTimeout(timeout);
  }
}

export const generateCharacterSoundEffect = action({
  args: {
    personaId: v.id("personas"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; storageId?: Id<"_storage">; error?: string }> => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.ambientAudioMutations.updatePersonaSfxStatus, {
        personaId: args.personaId,
        sfxGenerationStatus: "failed",
      });
      return { success: false, error: "ELEVENLABS_API_KEY not configured." };
    }

    const persona = await ctx.runQuery(api.scenarios.getPersonaById, {
      personaId: args.personaId,
    });
    if (!persona) return { success: false, error: "Persona not found." };

    // Idempotency: skip when already pending.
    if (persona.sfxGenerationStatus === "pending") {
      return { success: false, error: "SFX generation already in progress." };
    }

    // Reuse cache when complete and not stale.
    if (
      persona.sfxGenerationStatus === "complete" &&
      persona.sfxStorageId &&
      persona.sfxGeneratedAt &&
      !isCacheStale(persona.sfxGeneratedAt, Date.now())
    ) {
      return { success: true, storageId: persona.sfxStorageId };
    }

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: persona.scenarioId,
    });
    if (!scenario) return { success: false, error: "Scenario not found." };

    await ctx.runMutation(internal.ambientAudioMutations.updatePersonaSfxStatus, {
      personaId: args.personaId,
      sfxGenerationStatus: "pending",
    });

    const client = new ElevenLabsClient({ apiKey });
    const primaryPrompt = buildSoundEffectPrompt(
      {
        historicalRole: persona.historicalRole,
        geographicOrigin: persona.geographicOrigin,
      },
      { era: scenario.era, title: scenario.title }
    );

    let audioBlob: Blob;
    let usedPrompt = primaryPrompt;
    try {
      audioBlob = await generateSfx(client, primaryPrompt, SFX_TIMEOUT_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isBadPrompt = /bad_prompt|unprocessable|422/i.test(msg);
      if (isBadPrompt) {
        const simplified = `Ambient environmental sounds from the ${scenario.era} era. Low rumble, non-melodic, atmospheric background.`;
        try {
          audioBlob = await generateSfx(client, simplified, SFX_TIMEOUT_MS);
          usedPrompt = simplified;
        } catch (retryErr) {
          await ctx.runMutation(
            internal.ambientAudioMutations.updatePersonaSfxStatus,
            {
              personaId: args.personaId,
              sfxGenerationStatus: "failed",
              sfxGenerationPrompt: simplified,
            }
          );
          return {
            success: false,
            error: `SFX retry failed: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
          };
        }
      } else {
        await ctx.runMutation(
          internal.ambientAudioMutations.updatePersonaSfxStatus,
          {
            personaId: args.personaId,
            sfxGenerationStatus: "failed",
            sfxGenerationPrompt: primaryPrompt,
          }
        );
        return { success: false, error: `SFX generation failed: ${msg}` };
      }
    }

    const storageId = await ctx.storage.store(audioBlob);

    await ctx.runMutation(internal.ambientAudioMutations.updatePersonaSfxStatus, {
      personaId: args.personaId,
      sfxStorageId: storageId,
      sfxGeneratedAt: Date.now(),
      sfxGenerationPrompt: usedPrompt,
      sfxGenerationStatus: "complete",
    });

    return { success: true, storageId };
  },
});
