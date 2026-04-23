// Feature: pov-podcast, Property 8: Context Compaction Replaces Messages with Marked Summary
// Validates: Requirements 23.2, 23.3, 23.4, 23.5

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  COMPACTION_THRESHOLD,
  COMPACTED_HISTORY_MARKER,
  shouldCompact,
  ensureMarker,
  applyCompaction,
  buildCompactionResult,
  type ContextMessage,
  type PersonaAgentContextState,
} from "./contextCompaction";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const roleArb: fc.Arbitrary<ContextMessage["role"]> = fc.constantFrom(
  "system",
  "user",
  "assistant"
);

const contextMessageArb: fc.Arbitrary<ContextMessage> = fc.record({
  role: roleArb,
  content: fc.string({ minLength: 1, maxLength: 200 }),
  turnIndex: fc.nat({ max: 1000 }),
});

/**
 * Generates a state with exactly N messages (no prior compaction summaries).
 */
function stateWithNMessages(n: number): fc.Arbitrary<PersonaAgentContextState> {
  return fc
    .array(contextMessageArb, { minLength: n, maxLength: n })
    .map((messages) => ({
      contextMessages: messages.map((m, i) => ({ ...m, turnIndex: i })),
      compactionSummaries: [],
      messageCount: n,
    }));
}

/**
 * Generates a state with at least 20 messages (compaction threshold met).
 */
const stateAtThresholdArb: fc.Arbitrary<PersonaAgentContextState> = fc
  .integer({ min: COMPACTION_THRESHOLD, max: COMPACTION_THRESHOLD + 10 })
  .chain((n) => stateWithNMessages(n));

/**
 * Generates a state with fewer than 20 messages (compaction not yet needed).
 */
const stateBelowThresholdArb: fc.Arbitrary<PersonaAgentContextState> = fc
  .integer({ min: 0, max: COMPACTION_THRESHOLD - 1 })
  .chain((n) => stateWithNMessages(n));

/**
 * Arbitrary for a raw summary string (may or may not have the marker).
 */
const rawSummaryArb: fc.Arbitrary<string> = fc.oneof(
  // Summary without marker
  fc.string({ minLength: 10, maxLength: 300 }).filter(
    (s) => !s.startsWith(COMPACTED_HISTORY_MARKER)
  ),
  // Summary already with marker
  fc
    .string({ minLength: 10, maxLength: 300 })
    .map((s) => `${COMPACTED_HISTORY_MARKER}\n\n${s}`)
);

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("shouldCompact — unit tests", () => {
  it("returns false when messageCount is below threshold", () => {
    expect(shouldCompact(0)).toBe(false);
    expect(shouldCompact(19)).toBe(false);
  });

  it("returns true when messageCount equals threshold", () => {
    expect(shouldCompact(20)).toBe(true);
  });

  it("returns true when messageCount exceeds threshold", () => {
    expect(shouldCompact(21)).toBe(true);
    expect(shouldCompact(100)).toBe(true);
  });
});

describe("ensureMarker — unit tests", () => {
  it("prepends marker when summary does not start with it", () => {
    const summary = "Key events: the debate escalated.";
    const result = ensureMarker(summary);
    expect(result.startsWith(COMPACTED_HISTORY_MARKER)).toBe(true);
  });

  it("does not double-prepend when summary already starts with marker", () => {
    const summary = `${COMPACTED_HISTORY_MARKER}\n\nKey events: the debate escalated.`;
    const result = ensureMarker(summary);
    expect(result).toBe(summary);
    // Marker appears exactly once at the start
    expect(result.indexOf(COMPACTED_HISTORY_MARKER)).toBe(0);
    expect(result.lastIndexOf(COMPACTED_HISTORY_MARKER)).toBe(0);
  });

  it("preserves the original summary content after the marker", () => {
    const content = "Key events: the debate escalated.";
    const result = ensureMarker(content);
    expect(result).toContain(content);
  });
});

describe("applyCompaction — unit tests", () => {
  it("removes exactly 20 messages from the context window", () => {
    const messages: ContextMessage[] = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 25,
    };

    const result = applyCompaction(state, "Summary of events.", Date.now());
    expect(result.contextMessages).toHaveLength(5);
    expect(result.messageCount).toBe(5);
  });

  it("appends a new compaction summary to the summaries array", () => {
    const messages: ContextMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: "assistant" as const,
      content: `Turn ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 20,
    };

    const result = applyCompaction(state, "Summary.", Date.now());
    expect(result.compactionSummaries).toHaveLength(1);
  });

  it("the new summary always starts with [COMPACTED HISTORY]", () => {
    const messages: ContextMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 20,
    };

    const result = applyCompaction(state, "No marker here.", Date.now());
    expect(result.compactionSummaries[0].summary.startsWith(COMPACTED_HISTORY_MARKER)).toBe(true);
  });

  it("preserves existing compaction summaries", () => {
    const messages: ContextMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i + 20,
    }));
    const existingSummary = {
      summary: `${COMPACTED_HISTORY_MARKER}\n\nPrevious summary.`,
      coveredTurnRange: [0, 19] as [number, number],
      generatedAt: 1000,
      marker: COMPACTED_HISTORY_MARKER as typeof COMPACTED_HISTORY_MARKER,
    };
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [existingSummary],
      messageCount: 20,
    };

    const result = applyCompaction(state, "New summary.", Date.now());
    expect(result.compactionSummaries).toHaveLength(2);
    expect(result.compactionSummaries[0]).toEqual(existingSummary);
  });

  it("coveredTurnRange reflects the first and last compacted message turnIndex", () => {
    const messages: ContextMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i + 5, // offset to test non-zero start
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 20,
    };

    const result = applyCompaction(state, "Summary.", Date.now());
    expect(result.compactionSummaries[0].coveredTurnRange).toEqual([5, 24]);
  });

  it("remaining messages are the ones after the first 20", () => {
    const messages: ContextMessage[] = Array.from({ length: 23 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 23,
    };

    const result = applyCompaction(state, "Summary.", Date.now());
    expect(result.contextMessages).toHaveLength(3);
    expect(result.contextMessages[0].turnIndex).toBe(20);
    expect(result.contextMessages[1].turnIndex).toBe(21);
    expect(result.contextMessages[2].turnIndex).toBe(22);
  });
});

describe("buildCompactionResult — unit tests", () => {
  it("returns the first 20 messages as the covered range", () => {
    const messages: ContextMessage[] = Array.from({ length: 22 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 22,
    };

    const result = buildCompactionResult(state, "Summary.");
    expect(result.remainingMessages).toHaveLength(2);
    expect(result.coveredTurnRange).toEqual([0, 19]);
  });

  it("summary always starts with the marker", () => {
    const messages: ContextMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      turnIndex: i,
    }));
    const state: PersonaAgentContextState = {
      contextMessages: messages,
      compactionSummaries: [],
      messageCount: 20,
    };

    const result = buildCompactionResult(state, "No marker.");
    expect(result.summary.startsWith(COMPACTED_HISTORY_MARKER)).toBe(true);
  });
});

// ─── Property 8: Context Compaction Replaces Messages with Marked Summary ─────
// Feature: pov-podcast, Property 8: Context Compaction Replaces Messages with Marked Summary
// Validates: Requirements 23.2, 23.3, 23.4, 23.5

describe("Property 8: Context Compaction Replaces Messages with Marked Summary", () => {
  // Property 8a: shouldCompact returns true iff messageCount >= 20 (Req 23.1, 23.2)
  it("8a: shouldCompact triggers at exactly 20 messages and above (Req 23.1, 23.2)", () => {
    fc.assert(
      fc.property(fc.nat({ max: 50 }), (count) => {
        return shouldCompact(count) === (count >= COMPACTION_THRESHOLD);
      }),
      { numRuns: 100 }
    );
  });

  // Property 8b: After compaction, contextMessages has exactly (original - 20) messages (Req 23.4)
  it("8b: after compaction, context window shrinks by exactly 20 messages (Req 23.4)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const originalCount = state.contextMessages.length;
        const result = applyCompaction(state, rawSummary, Date.now());
        return result.contextMessages.length === originalCount - COMPACTION_THRESHOLD;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8c: The resulting summary always starts with [COMPACTED HISTORY] (Req 23.5)
  it("8c: compaction summary always starts with [COMPACTED HISTORY] marker (Req 23.5)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const result = applyCompaction(state, rawSummary, Date.now());
        const newSummary = result.compactionSummaries[result.compactionSummaries.length - 1];
        return newSummary.summary.startsWith(COMPACTED_HISTORY_MARKER);
      }),
      { numRuns: 100 }
    );
  });

  // Property 8d: The marker field on the summary object is always [COMPACTED HISTORY] (Req 23.5)
  it("8d: summary object marker field is always [COMPACTED HISTORY] (Req 23.5)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const result = applyCompaction(state, rawSummary, Date.now());
        const newSummary = result.compactionSummaries[result.compactionSummaries.length - 1];
        return newSummary.marker === COMPACTED_HISTORY_MARKER;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8e: compactionSummaries grows by exactly 1 after each compaction (Req 23.6)
  it("8e: compactionSummaries grows by exactly 1 per compaction (Req 23.6)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const before = state.compactionSummaries.length;
        const result = applyCompaction(state, rawSummary, Date.now());
        return result.compactionSummaries.length === before + 1;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8f: messageCount on the result equals contextMessages.length (Req 23.4)
  it("8f: messageCount always equals contextMessages.length after compaction (Req 23.4)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const result = applyCompaction(state, rawSummary, Date.now());
        return result.messageCount === result.contextMessages.length;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8g: The remaining messages are exactly the messages after index 20 (Req 23.4)
  it("8g: remaining messages are the messages after the first 20 (Req 23.4)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const expectedRemaining = state.contextMessages.slice(COMPACTION_THRESHOLD);
        const result = applyCompaction(state, rawSummary, Date.now());
        return (
          JSON.stringify(result.contextMessages) === JSON.stringify(expectedRemaining)
        );
      }),
      { numRuns: 100 }
    );
  });

  // Property 8h: coveredTurnRange[0] equals the turnIndex of the first compacted message (Req 23.3)
  it("8h: coveredTurnRange[0] is the turnIndex of the first compacted message (Req 23.3)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const firstTurnIndex = state.contextMessages[0]?.turnIndex ?? 0;
        const result = applyCompaction(state, rawSummary, Date.now());
        const newSummary = result.compactionSummaries[result.compactionSummaries.length - 1];
        return newSummary.coveredTurnRange[0] === firstTurnIndex;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8i: coveredTurnRange[1] equals the turnIndex of the 20th compacted message (Req 23.3)
  it("8i: coveredTurnRange[1] is the turnIndex of the 20th compacted message (Req 23.3)", () => {
    fc.assert(
      fc.property(stateAtThresholdArb, rawSummaryArb, (state, rawSummary) => {
        const lastCompactedTurnIndex =
          state.contextMessages[COMPACTION_THRESHOLD - 1]?.turnIndex ?? 0;
        const result = applyCompaction(state, rawSummary, Date.now());
        const newSummary = result.compactionSummaries[result.compactionSummaries.length - 1];
        return newSummary.coveredTurnRange[1] === lastCompactedTurnIndex;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8j: ensureMarker is idempotent — applying it twice gives the same result (Req 23.5)
  it("8j: ensureMarker is idempotent (Req 23.5)", () => {
    fc.assert(
      fc.property(rawSummaryArb, (summary) => {
        const once = ensureMarker(summary);
        const twice = ensureMarker(once);
        return once === twice;
      }),
      { numRuns: 100 }
    );
  });

  // Property 8k: compaction does NOT trigger when messageCount < 20 (Req 23.1)
  it("8k: shouldCompact returns false for any count below threshold (Req 23.1)", () => {
    fc.assert(
      fc.property(stateBelowThresholdArb, (state) => {
        return !shouldCompact(state.messageCount);
      }),
      { numRuns: 100 }
    );
  });

  // Property 8l: existing summaries are preserved after a new compaction (Req 23.6)
  it("8l: existing compaction summaries are preserved after a new compaction (Req 23.6)", () => {
    fc.assert(
      fc.property(
        stateAtThresholdArb,
        rawSummaryArb,
        fc.array(
          fc.record({
            summary: fc.string({ minLength: 1, maxLength: 100 }).map(
              (s) => `${COMPACTED_HISTORY_MARKER}\n\n${s}`
            ),
            coveredTurnRange: fc.tuple(fc.nat({ max: 100 }), fc.nat({ max: 100 })) as fc.Arbitrary<[number, number]>,
            generatedAt: fc.nat(),
            marker: fc.constant(COMPACTED_HISTORY_MARKER as typeof COMPACTED_HISTORY_MARKER),
          }),
          { minLength: 0, maxLength: 3 }
        ),
        (state, rawSummary, existingSummaries) => {
          const stateWithExisting: PersonaAgentContextState = {
            ...state,
            compactionSummaries: existingSummaries,
          };
          const result = applyCompaction(stateWithExisting, rawSummary, Date.now());
          // All existing summaries must still be present at the start
          for (let i = 0; i < existingSummaries.length; i++) {
            if (
              JSON.stringify(result.compactionSummaries[i]) !==
              JSON.stringify(existingSummaries[i])
            ) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
