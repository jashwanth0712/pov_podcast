"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { matchVoice } from "./voiceMatching";

/**
 * Validates a scenario topic string.
 * Requirements: 2.2, 2.5
 */
function validateTopic(topic: string): { valid: boolean; error?: string } {
  if (topic.length < 3) {
    return { valid: false, error: "Topic must be at least 3 characters long." };
  }
  if (topic.length > 500) {
    return { valid: false, error: "Topic must be no more than 500 characters long." };
  }
  return { valid: true };
}

/**
 * Persona data as returned by OpenRouter.
 */
interface GeneratedPersona {
  name: string;
  historicalRole: string;
  personalityTraits: string[];
  emotionalBackstory: string;
  speakingStyle: string;
  ideologicalPosition: string;
  geographicOrigin: string;
  estimatedAge: number;
  gender: string;
  articleReferences: Array<{
    url: string;
    title: string;
  }>;
}

/**
 * Full scenario data as returned by OpenRouter.
 */
interface GeneratedScenario {
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  initialDialogueOutline: string;
  personas: GeneratedPersona[];
}

/**
 * generateScenario Convex action.
 *
 * Calls OpenRouter to produce a scenario with up to 6 personas, assigns
 * ElevenLabs voice IDs via voice matching, persists to Convex, and triggers
 * avatar generation.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 3.1
 */
export const generateScenario = action({
  args: {
    topic: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    scenarioId?: string;
    error?: string;
  }> => {
    // Validate topic (Requirements 2.2, 2.5)
    const validation = validateTopic(args.topic);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Require authentication (Requirement 11.4)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "You must be logged in to generate a scenario." };
    }

    // Look up the user record
    const user = await ctx.runQuery(api.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      return { success: false, error: "User account not found." };
    }

    const openRouterModel = process.env.OPENROUTER_MODEL;
    if (!openRouterModel) {
      return { success: false, error: "OpenRouter model is not configured." };
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return { success: false, error: "OpenRouter API key is not configured." };
    }

    // Build the generation prompt
    const systemPrompt = `You are a historical scenario generator for an interactive podcast platform. 
Generate a rich, historically grounded scenario based on the user's topic.

Return a JSON object with this exact structure:
{
  "title": "string (concise, evocative title)",
  "timePeriod": "string (e.g. '1939–1945')",
  "era": "Ancient" | "Medieval" | "Modern" | "Contemporary",
  "description": "string (max 200 characters, compelling summary)",
  "initialDialogueOutline": "string (2-3 sentence outline of how the conversation should begin)",
  "personas": [
    {
      "name": "string (persona name or archetype)",
      "historicalRole": "string (their role in this event)",
      "personalityTraits": ["trait1", "trait2", "trait3"],
      "emotionalBackstory": "string (minimum 100 words — their personal history, motivations, fears, and emotional connection to this event)",
      "speakingStyle": "string (how they speak — formal, colloquial, regional dialect, etc.)",
      "ideologicalPosition": "string (their political/moral/philosophical stance)",
      "geographicOrigin": "string (country or region they are from)",
      "estimatedAge": number,
      "gender": "male" | "female" | "non-binary",
      "articleReferences": [
        { "url": "string", "title": "string" },
        { "url": "string", "title": "string" },
        { "url": "string", "title": "string" }
      ]
    }
  ]
}

Rules:
- Generate between 2 and 6 personas (maximum 6)
- Each persona must have a distinct perspective and emotional connection to the event
- Emotional backstories must be at least 100 words
- Article references should be plausibly real URLs from reputable historical sources
- The era must be one of: Ancient, Medieval, Modern, Contemporary
- Ensure diverse perspectives (different sides, roles, social classes)`;

    const userPrompt = `Generate a historical scenario for the topic: "${args.topic}"`;

    // Enforce 30-second timeout (Requirement 2.3)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let generatedData: GeneratedScenario;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pov-podcast.app",
          "X-Title": "POV Podcast",
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.8,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Scenario generation failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { success: false, error: "No content returned from scenario generator." };
      }

      generatedData = JSON.parse(content) as GeneratedScenario;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          error: "Scenario generation timed out after 30 seconds. Please try again.",
        };
      }
      return {
        success: false,
        error: `Scenario generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Enforce maximum of 6 personas (Requirement 2.7)
    const personas = generatedData.personas.slice(0, 6);

    // Assign ElevenLabs voice IDs via voice matching (Requirements 2.6, 3.1)
    const personasWithVoices = personas.map((persona) => {
      const voiceId = matchVoice({
        geographicOrigin: persona.geographicOrigin,
        estimatedAge: persona.estimatedAge,
        gender: persona.gender,
      });

      // Determine if scenario is fictional/speculative for article labelling (Req 13.7)
      const isSpeculative = false; // User-generated scenarios from real topics are treated as historical

      return {
        name: persona.name,
        historicalRole: persona.historicalRole,
        personalityTraits: persona.personalityTraits.slice(0, 10),
        emotionalBackstory: persona.emotionalBackstory,
        speakingStyle: persona.speakingStyle,
        ideologicalPosition: persona.ideologicalPosition,
        geographicOrigin: persona.geographicOrigin,
        estimatedAge: persona.estimatedAge,
        gender: persona.gender,
        voiceId,
        articleReferences: (persona.articleReferences ?? []).slice(0, 5).map((ref) => ({
          url: ref.url,
          title: ref.title,
          isVerified: false, // Will be verified by validateArticleUrl action
          isIllustrative: isSpeculative,
          ideologicalAlignment: persona.ideologicalPosition,
        })),
      };
    });

    // Persist to Convex (Requirement 2.4)
    const result = await ctx.runMutation(api.scenarioMutations.persistGeneratedScenario, {
      userId: user._id,
      title: generatedData.title,
      timePeriod: generatedData.timePeriod,
      era: generatedData.era,
      description: (generatedData.description ?? "").slice(0, 200),
      initialDialogueOutline: generatedData.initialDialogueOutline,
      personas: personasWithVoices,
    });

    // Trigger avatar generation for each persona (Requirement 22.2)
    for (const personaId of result.personaIds) {
      await ctx.scheduler.runAfter(0, api.generateAvatars.generateAvatars, {
        personaId,
      });
    }

    // Trigger article URL validation for each persona's references
    await ctx.scheduler.runAfter(0, api.validateArticleUrl.validateScenarioArticles, {
      scenarioId: result.scenarioId,
    });

    return { success: true, scenarioId: result.scenarioId };
  },
});
