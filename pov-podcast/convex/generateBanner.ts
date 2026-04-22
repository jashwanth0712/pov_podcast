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

function buildBannerPrompt(
  scenario: {
    title: string;
    timePeriod: string;
    era: string;
    description: string;
  }
): string {
  return `Cinematic wide shot depicting "${scenario.title}" from the ${scenario.era} era (${scenario.timePeriod}). ${scenario.description}. Dramatic historical scene, epic composition, atmospheric lighting, muted period-appropriate colors, painterly style, suitable as a banner image. Negative prompt: blurry, low-res, watermark, text, logo, modern elements, people facing camera, portraits, faces in focus`;
}

export const generateBanner = action({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodApiKey) {
      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId: args.scenarioId,
        bannerGenerationStatus: "failed",
      });
      return { success: false, error: "RunPod API key not configured." };
    }

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: args.scenarioId,
    });

    if (!scenario) {
      return { success: false, error: "Scenario not found." };
    }

    try {
      const bannerPrompt = buildBannerPrompt({
        title: scenario.title,
        timePeriod: scenario.timePeriod,
        era: scenario.era,
        description: scenario.description,
      });

      const jobId = await submitImageJob(bannerPrompt, runpodApiKey);
      const imageUrl = await pollForCompletion(jobId, runpodApiKey);

      // Download and upload to Convex storage
      const storageId = await downloadAndUploadToStorage(ctx, imageUrl);
      const bannerImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId: args.scenarioId,
        bannerImageUrl: bannerImageUrl ?? imageUrl,
        bannerImageStorageId: storageId,
        bannerGenerationStatus: "complete",
      });

      return { success: true };
    } catch (err) {
      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId: args.scenarioId,
        bannerGenerationStatus: "failed",
      });

      return {
        success: false,
        error: `Banner generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
});
