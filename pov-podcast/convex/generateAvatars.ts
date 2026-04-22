"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Core avatar generation logic — shared between initial generation and retries.
 */
async function runAvatarGeneration(
  personaId: string,
  runpodEndpointUrl: string,
  geminiModelId: string,
  runpodApiKey: string,
  persona: {
    name: string;
    historicalRole: string;
    personalityTraits: string[];
    geographicOrigin: string;
    estimatedAge: number;
    gender: string;
  },
  scenarioEra: string
): Promise<{ profileImageUrl: string; portraitImageUrl: string }> {
  const physicalDescription = `${persona.gender}, approximately ${persona.estimatedAge} years old, from ${persona.geographicOrigin}`;
  const personalityTraits = persona.personalityTraits.slice(0, 3).join(", ");

  // Submit job to RunPod (Requirement 22.1)
  const submitResponse = await fetch(`${runpodEndpointUrl}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${runpodApiKey}`,
    },
    body: JSON.stringify({
      input: {
        model: geminiModelId,
        prompts: {
          profile: `Animated profile portrait of ${persona.name}, ${persona.historicalRole}, ${scenarioEra} era, ${physicalDescription}, painterly style, circular crop`,
          portrait: `Full portrait of ${persona.name}, ${persona.historicalRole}, ${scenarioEra} era, ${physicalDescription}, historical oil painting style`,
        },
        personality: personalityTraits,
      },
    }),
  });

  if (!submitResponse.ok) {
    throw new Error(`RunPod job submission failed: ${submitResponse.status}`);
  }

  const submitData = await submitResponse.json() as { id: string; status: string };
  const jobId = submitData.id;

  if (!jobId) {
    throw new Error("RunPod did not return a job ID");
  }

  // Poll for completion (Requirement 22.2)
  const maxPollingAttempts = 60; // 60 attempts × 5 seconds = 5 minutes max
  const pollingIntervalMs = 5000;

  for (let attempt = 0; attempt < maxPollingAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));

    const statusResponse = await fetch(`${runpodEndpointUrl}/status/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${runpodApiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`RunPod status check failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json() as {
      status: string;
      output?: {
        profileImageUrl?: string;
        portraitImageUrl?: string;
      };
      error?: string;
    };

    if (statusData.status === "COMPLETED") {
      const profileImageUrl = statusData.output?.profileImageUrl;
      const portraitImageUrl = statusData.output?.portraitImageUrl;

      if (!profileImageUrl || !portraitImageUrl) {
        throw new Error("RunPod completed but did not return image URLs");
      }

      return { profileImageUrl, portraitImageUrl };
    }

    if (statusData.status === "FAILED" || statusData.status === "CANCELLED") {
      throw new Error(`RunPod job ${statusData.status}: ${statusData.error ?? "unknown error"}`);
    }

    // Continue polling for IN_QUEUE, IN_PROGRESS statuses
  }

  throw new Error("RunPod job timed out after polling");
}

/**
 * generateAvatars Convex action.
 *
 * Calls RunPod/Gemini endpoint to generate profile and portrait images for a persona.
 * Polls until completion, stores URLs, and schedules retries on failure.
 *
 * Requirements: 22.1, 22.2, 22.3, 22.5, 22.6
 */
export const generateAvatars = action({
  args: {
    personaId: v.id("personas"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Read endpoint URL and model ID from environment variables (Requirement 22.6)
    const runpodEndpointUrl = process.env.RUNPOD_ENDPOINT_URL;
    const geminiModelId = process.env.GEMINI_MODEL_ID;
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodEndpointUrl || !geminiModelId) {
      // Mark as failed and schedule retry
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        avatarGenerationStatus: "failed",
      });
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: 0,
      });
      return { success: false, error: "RunPod endpoint or Gemini model ID not configured." };
    }

    // Load persona data
    const persona = await ctx.runQuery(api.scenarios.getPersonaById, {
      personaId: args.personaId,
    });

    if (!persona) {
      return { success: false, error: "Persona not found." };
    }

    // Load scenario for era information
    const scenario = await ctx.runQuery(api.scenarios.getScenarioById, {
      scenarioId: persona.scenarioId,
    });

    const era = scenario?.era ?? "Contemporary";

    try {
      const { profileImageUrl, portraitImageUrl } = await runAvatarGeneration(
        args.personaId,
        runpodEndpointUrl,
        geminiModelId,
        runpodApiKey ?? "",
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

      // Store image URLs (Requirement 22.3)
      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl,
        portraitImageUrl,
        avatarGenerationStatus: "complete",
      });

      return { success: true };
    } catch (err) {
      // On failure: set status to "failed", schedule background retry (Requirement 22.5)
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

/**
 * Retry avatar generation with exponential backoff.
 * Requirements: 22.5
 */
export const retryGenerateAvatars = action({
  args: {
    personaId: v.id("personas"),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const runpodEndpointUrl = process.env.RUNPOD_ENDPOINT_URL;
    const geminiModelId = process.env.GEMINI_MODEL_ID;
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodEndpointUrl || !geminiModelId) {
      // Schedule next retry if attempts remain
      await ctx.runMutation(internal.avatarMutations.scheduleAvatarRetry, {
        personaId: args.personaId,
        attemptNumber: args.attemptNumber,
      });
      return { success: false, error: "RunPod endpoint or Gemini model ID not configured." };
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
      const { profileImageUrl, portraitImageUrl } = await runAvatarGeneration(
        args.personaId,
        runpodEndpointUrl,
        geminiModelId,
        runpodApiKey ?? "",
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

      await ctx.runMutation(internal.avatarMutations.updatePersonaAvatarStatus, {
        personaId: args.personaId,
        profileImageUrl,
        portraitImageUrl,
        avatarGenerationStatus: "complete",
      });

      return { success: true };
    } catch (err) {
      // Schedule next retry
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
