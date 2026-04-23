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

function buildProfilePrompt(
  persona: {
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

  return `Portrait of a ${persona.historicalRole} from the ${era} era. ${baseDescription}. Expression reflecting personality: ${traits}. Historical portrait style, warm studio lighting, detailed face, period-appropriate attire, painterly digital art. Negative prompt: blurry, low-res, watermark, text, logo, distorted features, extra limbs, modern clothing, anachronistic elements`;
}

export const generateAvatars = action({
  args: {
    personaId: v.id("personas"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        avatarGenerationStatus: "failed",
      });
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: 0,
      });
      return { success: false, error: "OpenRouter API key not configured." };
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
          historicalRole: persona.historicalRole,
          personalityTraits: persona.personalityTraits,
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
        },
        era
      );

      const imageUrl = await generateImageWithOpenRouter(profilePrompt, openrouterApiKey);

      // Upload to Convex storage (handles both base64 and URL)
      const storageId = await uploadToStorage(ctx, imageUrl);

      // Get the serving URL from Convex storage
      const profileImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl: profileImageUrl ?? undefined,
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
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: args.attemptNumber,
      });
      return { success: false, error: "OpenRouter API key not configured." };
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
          historicalRole: persona.historicalRole,
          personalityTraits: persona.personalityTraits,
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
        },
        era
      );

      const imageUrl = await generateImageWithOpenRouter(profilePrompt, openrouterApiKey);

      const storageId = await uploadToStorage(ctx, imageUrl);
      const profileImageUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl: profileImageUrl ?? undefined,
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
