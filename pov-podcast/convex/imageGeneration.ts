"use node";

import { action, internalAction } from "./_generated/server";
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
  apiKey: string
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
        size: "1024*1024",
        seed: -1,
        enable_safety_checker: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod submit failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as RunPodSubmitResponse;
  if (!data.id) throw new Error("No job ID returned");
  return data.id;
}

async function pollForCompletion(
  jobId: string,
  apiKey: string
): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const response = await fetch(`${RUNPOD_ENDPOINT}/status/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const data = (await response.json()) as RunPodStatusResponse;

    if (data.status === "COMPLETED") {
      const url = data.output?.image_url || data.output?.images?.[0];
      if (!url) throw new Error("No image URL in response");
      return url;
    }

    if (data.status === "FAILED" || data.status === "CANCELLED") {
      throw new Error(`Job ${data.status}: ${data.error ?? "unknown"}`);
    }
  }
  throw new Error("Timeout waiting for job");
}

function buildAvatarPrompt(
  name: string,
  role: string,
  era: string,
  gender: string,
  age: number,
  origin: string,
  traits: string[]
): string {
  return `Portrait of ${name}, a ${role} from the ${era} era. ${gender}, approximately ${age} years old, from ${origin}. Expression reflecting personality: ${traits.slice(0, 3).join(", ")}. Historical portrait style, warm studio lighting, detailed face, period-appropriate attire, painterly digital art. Negative prompt: blurry, low-res, watermark, text, logo, distorted features, modern clothing`;
}

function buildBannerPrompt(
  title: string,
  era: string,
  timePeriod: string,
  description: string
): string {
  return `Cinematic wide shot depicting "${title}" from the ${era} era (${timePeriod}). ${description}. Dramatic historical scene, epic composition, atmospheric lighting, muted period-appropriate colors, painterly style. Negative prompt: blurry, low-res, watermark, text, logo, modern elements, faces in focus`;
}

/**
 * Generate avatar for a single persona. No retries - fails fast.
 */
export const generateSingleAvatar = action({
  args: { personaId: v.id("personas") },
  handler: async (ctx, { personaId }) => {
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) return { success: false, error: "No API key" };

    const persona = await ctx.runQuery(api.scenarios.getPersonaById, { personaId });
    if (!persona) return { success: false, error: "Persona not found" };

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, { scenarioId: persona.scenarioId });
    const era = scenario?.era ?? "Contemporary";

    try {
      const prompt = buildAvatarPrompt(
        persona.name,
        persona.historicalRole,
        era,
        persona.gender,
        persona.estimatedAge,
        persona.geographicOrigin,
        persona.personalityTraits
      );

      const jobId = await submitImageJob(prompt, apiKey);
      const imageUrl = await pollForCompletion(jobId, apiKey);

      // Download and store
      const imgResponse = await fetch(imageUrl);
      const blob = await imgResponse.blob();
      const storageId = await ctx.storage.store(blob);
      const storedUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId,
        profileImageUrl: storedUrl ?? imageUrl,
        profileImageStorageId: storageId,
        avatarGenerationStatus: "complete",
      });

      return { success: true, personaId, imageUrl: storedUrl };
    } catch (err) {
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId,
        avatarGenerationStatus: "failed",
      });
      return { success: false, error: String(err) };
    }
  },
});

/**
 * Generate banner for a single scenario. No retries - fails fast.
 */
export const generateSingleBanner = action({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) return { success: false, error: "No API key" };

    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, { scenarioId });
    if (!scenario) return { success: false, error: "Scenario not found" };

    try {
      const prompt = buildBannerPrompt(
        scenario.title,
        scenario.era,
        scenario.timePeriod,
        scenario.description
      );

      const jobId = await submitImageJob(prompt, apiKey);
      const imageUrl = await pollForCompletion(jobId, apiKey);

      // Download and store
      const imgResponse = await fetch(imageUrl);
      const blob = await imgResponse.blob();
      const storageId = await ctx.storage.store(blob);
      const storedUrl = await ctx.storage.getUrl(storageId);

      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId,
        bannerImageUrl: storedUrl ?? imageUrl,
        bannerImageStorageId: storageId,
        bannerGenerationStatus: "complete",
      });

      return { success: true, scenarioId, imageUrl: storedUrl };
    } catch (err) {
      await ctx.runMutation(internal.bannerMutations.updateScenarioBannerStatus, {
        scenarioId,
        bannerGenerationStatus: "failed",
      });
      return { success: false, error: String(err) };
    }
  },
});

/**
 * Get list of all personas and scenarios that need images.
 */
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

/**
 * Run all pending image generation jobs sequentially.
 * Call this when RunPod billing is resolved.
 */
export const runAllPendingJobs = action({
  args: {},
  handler: async (ctx) => {
    const { pendingBanners, pendingAvatars } = await ctx.runAction(api.imageGeneration.getPendingImageJobs, {});

    const results = {
      banners: { success: 0, failed: 0, errors: [] as string[] },
      avatars: { success: 0, failed: 0, errors: [] as string[] },
    };

    // Generate banners first
    for (const b of pendingBanners) {
      const result = await ctx.runAction(api.imageGeneration.generateSingleBanner, {
        scenarioId: b.scenarioId as Id<"scenarios">,
      });
      if (result.success) {
        results.banners.success++;
      } else {
        results.banners.failed++;
        results.banners.errors.push(`${b.title}: ${result.error}`);
      }
    }

    // Generate avatars
    for (const a of pendingAvatars) {
      const result = await ctx.runAction(api.imageGeneration.generateSingleAvatar, {
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
