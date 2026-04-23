"use node";

/**
 * generateCitationExplanation Convex action.
 *
 * Given a session, persona, and article reference, generates a brief
 * explanation (2–3 sentences) from the persona's perspective of why they
 * cited that source and how it supports their position.
 *
 * Requirements: 18.5
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getModel } from "./lib/modelConfig";

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * generateCitationExplanation — public action.
 *
 * Loads the persona's context (name, historicalRole, ideologicalPosition,
 * emotionalBackstory) and calls OpenRouter to produce a short explanation
 * of why the persona cited the given article.
 *
 * Requirements: 18.5
 */
export const generateCitationExplanation = action({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    articleUrl: v.string(),
    articleTitle: v.string(),
  },
  handler: async (ctx, args): Promise<{ explanation: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured.");
    }

    // Load the persona record
    const persona = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("./_generated/api")).api.scenarios.getPersonaById as any,
      { personaId: args.personaId }
    );

    if (!persona) {
      throw new Error("Persona not found.");
    }

    const systemPrompt =
      `You are ${persona.name}, ${persona.historicalRole}. ` +
      `Your ideological position: ${persona.ideologicalPosition}. ` +
      `Your backstory: ${persona.emotionalBackstory.slice(0, 300)}`;

    const userPrompt =
      `You cited the article titled "${args.articleTitle}" (${args.articleUrl}) during a discussion. ` +
      `In 2–3 sentences, explain from your personal perspective why you cited this source and how it supports your position. ` +
      `Speak in first person, in character.`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://pov-podcast.app",
          "X-Title": "POV Podcast",
        },
        body: JSON.stringify({
          model: getModel("conversation"),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter error ${response.status}: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const explanation =
      data.choices?.[0]?.message?.content?.trim() ??
      "No explanation available.";

    return { explanation };
  },
});
