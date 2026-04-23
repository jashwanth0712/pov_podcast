/**
 * Pure cache-staleness and mood-utility functions for the Ambient Audio system.
 *
 * All functions are pure with no side effects, making them directly testable.
 *
 * Requirements: 4.4, 6.1, 6.2, 6.6
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The set of emotional moods a Persona can be in, matching the schema's
 * `emotionalStateSnapshot.mood` union.
 */
export type Mood =
  | "calm"
  | "frustrated"
  | "passionate"
  | "defensive"
  | "resigned";

// ─── Constants ────────────────────────────────────────────────────────────────

/** 90 days expressed in milliseconds. */
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** 5 minutes expressed in milliseconds. */
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// ─── isCacheStale ─────────────────────────────────────────────────────────────

/**
 * Returns `true` if and only if the cached audio is older than 90 days.
 *
 * The threshold is strict: a difference of exactly 90 days returns `false`.
 * Only a difference *greater than* 90 days returns `true`.
 *
 * @param generatedAt - Unix timestamp (ms) when the audio was generated.
 * @param now         - Current Unix timestamp (ms).
 *
 * Requirements: 4.4
 */
export function isCacheStale(generatedAt: number, now: number): boolean {
  return now - generatedAt > NINETY_DAYS_MS;
}

// ─── computeDominantMood ──────────────────────────────────────────────────────

/**
 * Returns the most frequently occurring mood in the array.
 *
 * Tie-breaking is deterministic: when two moods share the highest frequency,
 * the one that appears **first** in the input array is returned.
 *
 * @param moods - Non-empty array of Mood values.
 *
 * Requirements: 6.1
 */
export function computeDominantMood(moods: Mood[]): Mood {
  // Count occurrences while preserving first-seen order.
  const counts = new Map<Mood, number>();
  const firstSeen: Mood[] = [];

  for (const mood of moods) {
    if (!counts.has(mood)) {
      counts.set(mood, 0);
      firstSeen.push(mood);
    }
    counts.set(mood, (counts.get(mood) as number) + 1);
  }

  // Find the maximum count.
  let maxCount = 0;
  for (const count of counts.values()) {
    if (count > maxCount) maxCount = count;
  }

  // Return the first mood (in original array order) that has the max count.
  for (const mood of firstSeen) {
    if ((counts.get(mood) as number) === maxCount) {
      return mood;
    }
  }

  // Unreachable for a non-empty array, but satisfies the type checker.
  return moods[0];
}

// ─── detectEmotionalToneShift ─────────────────────────────────────────────────

/**
 * Detects whether the conversation has shifted to a new dominant mood.
 *
 * Returns `true` if and only if:
 *   1. `moodHistory` has at least 4 entries.
 *   2. The last 3 entries in `moodHistory` are all equal to `currentMood`.
 *   3. The entry immediately before those 3 (`moodHistory[length - 4]`)
 *      differs from `currentMood`.
 *
 * `currentMood` represents the mood being appended; `moodHistory` already
 * contains the 3 most recent entries equal to `currentMood`.
 *
 * Returns `false` if `moodHistory` has fewer than 4 entries.
 *
 * @param moodHistory - Array of past moods (most recent last).
 * @param currentMood - The mood that has just been observed.
 *
 * Requirements: 6.2
 */
export function detectEmotionalToneShift(
  moodHistory: Mood[],
  currentMood: Mood
): boolean {
  if (moodHistory.length < 4) {
    return false;
  }

  const len = moodHistory.length;

  // The last 3 entries must all equal currentMood.
  if (
    moodHistory[len - 1] !== currentMood ||
    moodHistory[len - 2] !== currentMood ||
    moodHistory[len - 3] !== currentMood
  ) {
    return false;
  }

  // The entry immediately before those 3 must differ from currentMood.
  return moodHistory[len - 4] !== currentMood;
}

// ─── canTriggerToneShift ──────────────────────────────────────────────────────

/**
 * Returns whether enough time has elapsed since the last tone shift to allow
 * a new one, enforcing the 5-minute rate limit (Requirement 6.6).
 *
 * Returns `true` if:
 *   - `lastShiftTimestamp` is `null` (no previous shift has occurred), OR
 *   - `(now - lastShiftTimestamp) >= 5 * 60 * 1000` (at least 5 minutes have
 *     passed since the last shift).
 *
 * Returns `false` otherwise.
 *
 * @param lastShiftTimestamp - Unix timestamp (ms) of the last tone shift, or
 *                             `null` if no shift has occurred yet.
 * @param now                - Current Unix timestamp (ms).
 *
 * Requirements: 6.6
 */
export function canTriggerToneShift(
  lastShiftTimestamp: number | null,
  now: number
): boolean {
  if (lastShiftTimestamp === null) {
    return true;
  }
  return now - lastShiftTimestamp >= FIVE_MINUTES_MS;
}
