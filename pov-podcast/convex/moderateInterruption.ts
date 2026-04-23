"use node";

/**
 * moderateInterruption Convex action.
 *
 * Classifies user interruption input as SAFE or UNSAFE via OpenRouter.
 * Enforces a 2-second timeout (Req 25.5).
 * If UNSAFE, logs the rejection to `rejectedInterruptions` — full content
 * is NOT stored (Req 25.4).
 *
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { models } from "./lib/modelConfig";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODERATION_TIMEOUT_MS = 2000;

/**
 * Content moderation system prompt.
 * Instructs the model to classify input as SAFE or UNSAFE and return JSON.
 */
const MODERATION_SYSTEM_PROMPT =
  "You are a content moderator. Classify the following user input as SAFE or UNSAFE. " +
  "Unsafe content includes hate speech, explicit violence, sexual content, or personal attacks. " +
  'Respond with JSON: { "classification": "SAFE" | "UNSAFE", "reason": string }';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModerationResult {
  classification: "SAFE" | "UNSAFE";
  reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the raw LLM response text into a ModerationResult.
 * Falls back to UNSAFE if the response cannot be parsed, to err on the side
 * of caution.
 */
function parseModerationResponse(raw: string): ModerationResult {
  // Try to extract JSON from the response (model may wrap it in markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        classification?: unknown;
        reason?: unknown;
      };
      const classification =
        parsed.classification === "SAFE" || parsed.classification === "UNSAFE"
          ? parsed.classification
          : "UNSAFE";
      const reason =
        typeof parsed.reason === "string" && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : "Content could not be classified";
      return { classification, reason };
    } catch {
      // Fall through to fallback
    }
  }

  // Plain-text fallback: look for SAFE / UNSAFE keyword
  const upper = raw.toUpperCase();
  if (upper.includes("UNSAFE")) {
    return { classification: "UNSAFE", reason: "Content flagged as unsafe" };
  }
  if (upper.includes("SAFE")) {
    return { classification: "SAFE", reason: "Content is safe" };
  }

  // Cannot determine — default to UNSAFE (conservative)
  return {
    classification: "UNSAFE",
    reason: "Moderation response could not be parsed",
  };
}

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * moderateInterruption — internal action.
 *
 * Calls OpenRouter with the content moderation prompt and enforces a 2-second
 * timeout via AbortController. Returns the classification and reason.
 * If UNSAFE, logs the rejection (without storing the full content).
 *
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 */
export const moderateInterruption = internalAction({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ classification: "SAFE" | "UNSAFE"; reason: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // If we cannot moderate, default to UNSAFE to protect the platform
      return {
        classification: "UNSAFE",
        reason: "Moderation service unavailable",
      };
    }

    // ── Call OpenRouter with 2-second timeout (Req 25.5) ─────────────────────
    const controller = new AbortController();
    const timeoutHandle = setTimeout(
      () => controller.abort(),
      MODERATION_TIMEOUT_MS
    );

    let result: ModerationResult;

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pov-podcast.app",
            "X-Title": "POV Podcast",
          },
          body: JSON.stringify({
            model: models.light,
            messages: [
              { role: "system", content: MODERATION_SYSTEM_PROMPT },
              { role: "user", content: args.text },
            ],
            max_tokens: 100,
            temperature: 0,
            provider: {
              preferred_max_latency: 2,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const rawContent = data.choices?.[0]?.message?.content ?? "";
      result = parseModerationResponse(rawContent);
    } catch (err) {
      // Timeout or network error — default to UNSAFE (conservative, Req 25.5)
      const isAbort =
        err instanceof Error && err.name === "AbortError";
      result = {
        classification: "UNSAFE",
        reason: isAbort
          ? "Moderation timed out"
          : `Moderation error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }

    // ── Log rejected interruptions (Req 25.3, 25.4) ──────────────────────────
    if (result.classification === "UNSAFE") {
      // Fire-and-forget: log the rejection without blocking the response.
      // Full content (args.text) is intentionally NOT passed to the mutation.
      await ctx.runMutation(internal.moderationMutations.logRejectedInterruption, {
        sessionId: args.sessionId,
        rejectionReason: result.reason,
      });
    }

    return result;
  },
});
