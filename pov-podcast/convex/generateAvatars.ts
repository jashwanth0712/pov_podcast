"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const RUNPOD_ENDPOINT = "https://api.runpod.ai/v2/wan-2-6-t2i";

interface RunPodSubmitResponse {
  id: string;
  status: string;
}

interface RunPodStatusResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: {
    image_url?: string;
    images?: string[];
  };
  error?: string;
}

async function submitImageJob(
  prompt: string,
  apiKey: string,
  size: string = "1024*1024"
): Promise<string> {
  const response = await fetch(`${RUNPOD_ENDPOINT}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: {
        prompt,
        size,
        seed: -1,
        enable_safety_checker: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod job submission failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as RunPodSubmitResponse;
  if (!data.id) {
    throw new Error("RunPod did not return a job ID");
  }

  return data.id;
}

async function pollForCompletion(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const response = await fetch(`${RUNPOD_ENDPOINT}/status/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`RunPod status check failed: ${response.status}`);
    }

    const data = (await response.json()) as RunPodStatusResponse;

    if (data.status === "COMPLETED") {
      const imageUrl = data.output?.image_url || data.output?.images?.[0];
      if (!imageUrl) {
        throw new Error("RunPod completed but did not return image URL");
      }
      return imageUrl;
    }

    if (data.status === "FAILED" || data.status === "CANCELLED") {
      throw new Error(`RunPod job ${data.status}: ${data.error ?? "unknown error"}`);
    }
  }

  throw new Error("RunPod job timed out after polling");
}

async function downloadAndUploadToStorage(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  imageUrl: string
): Promise<Id<"_storage">> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const blob = await response.blob();
  const storageId = await ctx.storage.store(blob);

  return storageId;
}

function buildProfilePrompt(
  persona: {
    name: string;
    historicalRole: string;
    personalityTraits: string[];
    geographicOrigin: string;
    estimatedAge: number;
    gender: string;
  },
  era: string
): string {
  const traits = persona.personalityTraits.slice(0, 3).join(", ");
  const baseDescription = `${persona.gender}, approximately ${persona.estimatedAge} years old, from ${persona.geographicOrigin}`;

  return `Portrait of ${persona.name}, a ${persona.historicalRole} from the ${era} era. ${baseDescription}. Expression reflecting personality: ${traits}. Historical portrait style, warm studio lighting, detailed face, period-appropriate attire, painterly digital art. Negative prompt: blurry, low-res, watermark, text, logo, distorted features, extra limbs, modern clothing, anachronistic elements`;
}

export const generateAvatars = action({
  args: {
    personaId: v.id("personas"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodApiKey) {
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        avatarGenerationStatus: "failed",
      });
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: 0,
      });
      return { success: false, error: "RunPod API key not configured." };
    }

    const persona = await ctx.runQuery(api.scenarios.getPersonaById, {
      personaId: args.personaId,
    });

    if (!persona) {
      return { success: false, error: "Persona not found." };
    }

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: persona.scenarioId,
    });

    const era = scenario?.era ?? "Contemporary";

    try {
      const profilePrompt = buildProfilePrompt(
        {
          name: persona.name,
          historicalRole: persona.historicalRole,
          personalityTraits: persona.personalityTraits,
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
        },
        era
      );

      // Submit job and poll for completion
      const jobId = await submitImageJob(profilePrompt, runpodApiKey);
      const imageUrl = await pollForCompletion(jobId, runpodApiKey);

      // Download and upload to Convex storage
      const storageId = await downloadAndUploadToStorage(ctx, imageUrl);

      // Get the serving URL from Convex storage
      const profileImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl: profileImageUrl ?? imageUrl,
        profileImageStorageId: storageId,
        avatarGenerationStatus: "complete",
      });

      return { success: true };
    } catch (err) {
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        avatarGenerationStatus: "failed",
      });
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: 0,
      });

      return {
        success: false,
        error: `Avatar generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});

export const retryGenerateAvatars = action({
  args: {
    personaId: v.id("personas"),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodApiKey) {
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: args.attemptNumber,
      });
      return { success: false, error: "RunPod API key not configured." };
    }

    const persona = await ctx.runQuery(api.scenarios.getPersonaById, {
      personaId: args.personaId,
    });

    if (!persona) {
      return { success: false, error: "Persona not found." };
    }

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: persona.scenarioId,
    });

    const era = scenario?.era ?? "Contemporary";

    try {
      const profilePrompt = buildProfilePrompt(
        {
          name: persona.name,
          historicalRole: persona.historicalRole,
          personalityTraits: persona.personalityTraits,
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
        },
        era
      );

      const jobId = await submitImageJob(profilePrompt, runpodApiKey);
      const imageUrl = await pollForCompletion(jobId, runpodApiKey);

      const storageId = await downloadAndUploadToStorage(ctx, imageUrl);
      const profileImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl: profileImageUrl ?? imageUrl,
        profileImageStorageId: storageId,
        avatarGenerationStatus: "complete",
      });

      return { success: true };
    } catch (err) {
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: args.attemptNumber,
      });

      return {
        success: false,
        error: `Avatar generation retry ${args.attemptNumber} failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});
