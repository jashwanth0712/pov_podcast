/**
 * Pure context compaction logic — no Convex dependencies.
 *
 * Extracted so it can be unit-tested and property-tested without a running
 * Convex environment.
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7
 */

export const COMPACTION_THRESHOLD = 20;
export const COMPACTED_HISTORY_MARKER = "[COMPACTED HISTORY]";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMessage {
  role: "system" | "user" | "assistant";
  content: string;
  turnIndex: number;
}

export interface CompactionSummary {
  summary: string;
  coveredTurnRange: [number, number];
  generatedAt: number;
  marker: typeof COMPACTED_HISTORY_MARKER;
}

export interface PersonaAgentContextState {
  contextMessages: ContextMessage[];
  compactionSummaries: CompactionSummary[];
  messageCount: number;
}

export interface CompactionResult {
  /** The summary text, guaranteed to start with [COMPACTED HISTORY] */
  summary: string;
  /** The turn range covered by this compaction [first, last] */
  coveredTurnRange: [number, number];
  /** Messages that remain after the 20 compacted ones are removed */
  remainingMessages: ContextMessage[];
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Returns true when a persona agent's context window has reached the
 * compaction threshold (20 messages).
 *
 * Requirement 23.1: track message count and trigger at 20.
 */
export function shouldCompact(messageCount: number): boolean {
  return messageCount >= COMPACTION_THRESHOLD;
}

/**
 * Ensures a summary string is prefixed with the [COMPACTED HISTORY] marker.
 *
 * Requirement 23.5: the summary must be prepended with the marker so the LLM
 * understands it is reading a summary rather than raw dialogue.
 */
export function ensureMarker(summary: string): string {
  if (summary.startsWith(COMPACTED_HISTORY_MARKER)) {
    return summary;
  }
  return `${COMPACTED_HISTORY_MARKER}\n\n${summary}`;
}

/**
 * Applies a compaction summary to a persona agent's context state.
 *
 * - Removes the first 20 raw messages (Req 23.4)
 * - Appends the new summary to `compactionSummaries` (Req 23.6)
 * - Updates `messageCount` to reflect the remaining messages
 *
 * Requirements: 23.3, 23.4, 23.5, 23.6
 */
export function applyCompaction(
  state: PersonaAgentContextState,
  summaryText: string,
  generatedAt: number
): PersonaAgentContextState {
  const messagesToCompact = state.contextMessages.slice(0, COMPACTION_THRESHOLD);
  const remainingMessages = state.contextMessages.slice(COMPACTION_THRESHOLD);

  const markedSummary = ensureMarker(summaryText);

  const coveredTurnRange: [number, number] = [
    messagesToCompact[0]?.turnIndex ?? 0,
    messagesToCompact[messagesToCompact.length - 1]?.turnIndex ?? 0,
  ];

  const newSummary: CompactionSummary = {
    summary: markedSummary,
    coveredTurnRange,
    generatedAt,
    marker: COMPACTED_HISTORY_MARKER,
  };

  return {
    contextMessages: remainingMessages,
    compactionSummaries: [...state.compactionSummaries, newSummary],
    messageCount: remainingMessages.length,
  };
}

/**
 * Prepares the compaction result from a raw summary string and the current
 * agent state. Used by the Convex action before persisting.
 *
 * Requirements: 23.3, 23.4, 23.5
 */
export function buildCompactionResult(
  state: PersonaAgentContextState,
  rawSummary: string
): CompactionResult {
  const messagesToCompact = state.contextMessages.slice(0, COMPACTION_THRESHOLD);
  const remainingMessages = state.contextMessages.slice(COMPACTION_THRESHOLD);

  return {
    summary: ensureMarker(rawSummary),
    coveredTurnRange: [
      messagesToCompact[0]?.turnIndex ?? 0,
      messagesToCompact[messagesToCompact.length - 1]?.turnIndex ?? 0,
    ],
    remainingMessages,
  };
}
