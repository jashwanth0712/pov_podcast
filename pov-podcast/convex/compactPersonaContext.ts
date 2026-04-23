"use node";

/**
 * compactPersonaContext Convex action.
 *
 * Triggered when a persona agent's context window reaches 20 messages.
 * Generates a structured summary via OpenRouter capturing key events,
 * emotional arc, ideological positions, and concessions.
 * Replaces 20 raw messages with a single summary prepended with
 * [COMPACTED HISTORY] marker.
 *
 * NOTE: Full implementation is in Task 12.1. This file provides the
 * action signature so the scheduler reference in generatePersonaTurn
 * compiles correctly.
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { models } from "./lib/modelConfig";


const COMPACTION_SYSTEM_PROMPT = `You are a conversation historian. Summarise the following conversation history into a structured summary that captures:
1. Key events and turning points in the discussion
2. The emotional arc of the speaker (how their mood and conviction evolved)
3. Ideological positions stated and defended
4. Any concessions or agreements made
5. Unresolved tensions or open questions

Be concise but comprehensive. The summary will replace the raw message history in the speaker's context window.
Prefix your output with: [COMPACTED HISTORY]`;

/**
 * Compacts a persona agent's context window when it reaches 20 messages.
 * Requirements: 23.1–23.7
 */
export const compactPersonaContext = internalAction({
  args: {
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENROUTER_API_KEY not configured" };
    }

    // Load current agent state
    const agentState = await ctx.runQuery(
      internal.generatePersonaTurnQueries.queryAgentState,
      {
        sessionId: args.sessionId,
        personaId: args.personaId,
        branchId: args.branchId,
      }
    );

    if (!agentState) {
      return { success: false, error: "Agent state not found" };
    }

    // Only compact if we have 20+ messages (Req 23.1)
    if (agentState.messageCount < 20) {
      return { success: true };
    }

    const messagesToCompact = agentState.contextMessages.slice(0, 20);

    // Generate summary via OpenRouter (Req 23.2)
    let summary: string;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://pov-podcast.app",
          "X-Title": "POV Podcast",
        },
        body: JSON.stringify({
          model: models.conversation,
          messages: [
            { role: "system", content: COMPACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify(
                messagesToCompact.map((m) => ({ role: m.role, content: m.content }))
              ),
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        // On failure: retain raw messages and retry on next turn (Req 23.7)
        return { success: false, error: `OpenRouter error: ${response.status}` };
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      summary = data.choices?.[0]?.message?.content ?? "";
      if (!summary) {
        return { success: false, error: "Empty summary returned" };
      }
    } catch (err) {
      // On failure: retain raw messages (Req 23.7)
      return {
        success: false,
        error: `Compaction failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Ensure summary starts with the [COMPACTED HISTORY] marker (Req 23.3)
    if (!summary.startsWith("[COMPACTED HISTORY]")) {
      summary = `[COMPACTED HISTORY]\n\n${summary}`;
    }

    // Persist the compaction summary and replace the 20 raw messages (Req 23.4, 23.5)
    await ctx.runMutation(internal.compactionMutations.persistCompaction, {
      sessionId: args.sessionId,
      personaId: args.personaId,
      branchId: args.branchId,
      summary,
      coveredTurnRange: [
        messagesToCompact[0]?.turnIndex ?? 0,
        messagesToCompact[messagesToCompact.length - 1]?.turnIndex ?? 0,
      ],
      remainingMessages: agentState.contextMessages.slice(20),
    });

    return { success: true };
  },
});
