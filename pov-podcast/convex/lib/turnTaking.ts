/**
 * Pure turn-taking logic for the POV Podcast orchestrator.
 *
 * Contains:
 * - Relevance scoring and speaker selection
 * - Round Robin speaker selection
 * - Random speaker selection
 * - Deadlock detection
 *
 * Requirements: 14.2, 14.3, 14.4, 17.1, 20.3, 21.6
 */

export interface EmotionalState {
  mood: "calm" | "frustrated" | "passionate" | "defensive" | "resigned";
  convictionLevel: number;       // 0.0–1.0
  willingnessToConcede: number;  // 0.0–1.0
}

export interface PersonaForScoring {
  personaId: string;
  emotionalState: EmotionalState;
  ideologicalPosition: string;
}

export interface RelationshipForScoring {
  personaAId: string;
  personaBId: string;
  relationshipType: string;
}

// ─── Relevance scoring helpers ────────────────────────────────────────────────

/**
 * Emotional relevance score: (1 - willingnessToConcede) × convictionLevel
 */
function emotionalRelevanceScore(persona: PersonaForScoring): number {
  return (1 - persona.emotionalState.willingnessToConcede) * persona.emotionalState.convictionLevel;
}

/**
 * Relationship factor:
 * - 1.5 if rival and lastTurn contained a challenge word
 * - 1.3 if ally and lastTurn contained a support word
 * - 1.0 otherwise
 */
function relationshipFactor(
  personaId: string,
  lastSpeakerId: string | null,
  lastTurnText: string,
  relationships: RelationshipForScoring[]
): number {
  if (!lastSpeakerId) return 1.0;

  const rel = relationships.find(
    (r) =>
      (r.personaAId === personaId && r.personaBId === lastSpeakerId) ||
      (r.personaAId === lastSpeakerId && r.personaBId === personaId)
  );

  if (!rel) return 1.0;

  const lower = lastTurnText.toLowerCase();

  const CHALLENGE_WORDS = [
    "wrong",
    "disagree",
    "challenge",
    "oppose",
    "reject",
    "refute",
    "deny",
    "false",
    "mistaken",
    "error",
  ];
  const SUPPORT_WORDS = [
    "agree",
    "support",
    "exactly",
    "right",
    "correct",
    "indeed",
    "absolutely",
    "yes",
    "true",
    "well said",
  ];

  const isRival =
    rel.relationshipType === "rivalry" || rel.relationshipType === "historical_enmity";
  const isAlly =
    rel.relationshipType === "alliance" || rel.relationshipType === "ideological_kinship";

  if (isRival && CHALLENGE_WORDS.some((w) => lower.includes(w))) return 1.5;
  if (isAlly && SUPPORT_WORDS.some((w) => lower.includes(w))) return 1.3;

  return 1.0;
}

/**
 * Ideological tension score:
 * - 1.0 if persona's position opposes lastTurn's position (simple heuristic: no shared keywords)
 * - 0.5 otherwise
 */
function ideologicalTensionScore(
  persona: PersonaForScoring,
  lastTurnText: string
): number {
  if (!lastTurnText) return 0.5;

  const positionWords = persona.ideologicalPosition
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const lastTurnLower = lastTurnText.toLowerCase();
  const hasSharedKeyword = positionWords.some((w) => lastTurnLower.includes(w));

  // If no shared keywords, positions are likely opposed → higher tension
  return hasSharedKeyword ? 0.5 : 1.0;
}

/**
 * Selects the next speaker using relevance scoring.
 *
 * score(persona) =
 *   emotionalRelevanceScore × 0.4
 *   + relationshipFactor × 0.3
 *   + ideologicalTensionScore × 0.3
 *
 * Excludes the last speaker.
 *
 * Requirements: 14.2, 20.3, 21.6
 */
export function selectNextSpeakerRelevance(
  personas: PersonaForScoring[],
  lastSpeakerId: string | null,
  lastTurnText: string,
  relationships: RelationshipForScoring[]
): string {
  const candidates = lastSpeakerId
    ? personas.filter((p) => p.personaId !== lastSpeakerId)
    : personas;

  if (candidates.length === 0) {
    // Fallback: if all are excluded (shouldn't happen), pick from all
    return personas[0].personaId;
  }

  let bestId = candidates[0].personaId;
  let bestScore = -Infinity;

  for (const persona of candidates) {
    const score =
      emotionalRelevanceScore(persona) * 0.4 +
      relationshipFactor(persona.personaId, lastSpeakerId, lastTurnText, relationships) * 0.3 +
      ideologicalTensionScore(persona, lastTurnText) * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestId = persona.personaId;
    }
  }

  return bestId;
}

// ─── Round Robin ──────────────────────────────────────────────────────────────

/**
 * Selects the next speaker using round-robin ordering.
 *
 * Returns the persona at `currentIndex` and the next index (wrapping around).
 *
 * Requirements: 14.3
 */
export function selectNextSpeakerRoundRobin(
  personaIds: string[],
  currentIndex: number
): { personaId: string; nextIndex: number } {
  if (personaIds.length === 0) {
    throw new Error("personaIds must not be empty");
  }

  const safeIndex = ((currentIndex % personaIds.length) + personaIds.length) % personaIds.length;
  const personaId = personaIds[safeIndex];
  const nextIndex = (safeIndex + 1) % personaIds.length;

  return { personaId, nextIndex };
}

// ─── Random ───────────────────────────────────────────────────────────────────

/**
 * Selects the next speaker randomly, excluding the last speaker.
 *
 * Requirements: 14.4
 */
export function selectNextSpeakerRandom(
  personaIds: string[],
  lastSpeakerId: string | null
): string {
  if (personaIds.length === 0) {
    throw new Error("personaIds must not be empty");
  }

  const candidates = lastSpeakerId
    ? personaIds.filter((id) => id !== lastSpeakerId)
    : personaIds;

  // If all are excluded (only one persona), fall back to all
  const pool = candidates.length > 0 ? candidates : personaIds;

  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ─── Deadlock detection ───────────────────────────────────────────────────────

/**
 * Detects a deadlock in the conversation.
 *
 * Returns true if:
 * - The last `threshold` (default 3) turns all have the same speakerId, OR
 * - The last `threshold` turns all contain the same dominant ideological keyword
 *
 * Requirements: 17.1
 */
export function detectDeadlock(
  recentTurns: Array<{ speakerId: string; text: string }>,
  threshold = 3
): boolean {
  if (recentTurns.length < threshold) return false;

  const lastN = recentTurns.slice(-threshold);

  // Check 1: same speakerId for all last N turns
  const firstSpeakerId = lastN[0].speakerId;
  if (lastN.every((t) => t.speakerId === firstSpeakerId)) {
    return true;
  }

  // Check 2: same dominant ideological keyword in all last N turns
  // Extract words of length > 4 from the first turn as candidate keywords
  const firstTurnWords = lastN[0].text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);

  for (const keyword of firstTurnWords) {
    if (lastN.every((t) => t.text.toLowerCase().includes(keyword))) {
      return true;
    }
  }

  return false;
}
