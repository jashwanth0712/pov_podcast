"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "black-forest-labs/flux.2-pro";

interface OpenRouterImageResponse {
  choices: Array<{
    message: {
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
      }>;
    };
  }>;
  usage?: {
    cost?: number;
  };
}

async function generateImageWithOpenRouter(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pov-podcast.app",
      "X-Title": "POV Podcast",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter image generation failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterImageResponse;
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl) {
    throw new Error("OpenRouter did not return an image URL");
  }

  return imageUrl;
}

async function base64ToBlob(dataUrl: string): Promise<Blob> {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: "image/png" });
}

async function uploadToStorage(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  imageUrl: string
): Promise<Id<"_storage">> {
  let blob: Blob;

  if (imageUrl.startsWith("data:")) {
    blob = await base64ToBlob(imageUrl);
  } else {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    blob = await response.blob();
  }

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
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId: args.scenarioId,
        bannerGenerationStatus: "failed",
      });
      return { success: false, error: "OpenRouter API key not configured." };
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

      const imageUrl = await generateImageWithOpenRouter(bannerPrompt, openrouterApiKey);

      // Upload to Convex storage (handles both base64 and URL)
      const storageId = await uploadToStorage(ctx, imageUrl);
      const bannerImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId: args.scenarioId,
        bannerImageUrl: bannerImageUrl ?? undefined,
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
