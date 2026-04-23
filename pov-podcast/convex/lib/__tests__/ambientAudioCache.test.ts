// Feature: elevenlabs-ambient-audio, Property 6
// Feature: elevenlabs-ambient-audio, Property 7
// Feature: elevenlabs-ambient-audio, Property 8

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  isCacheStale,
  computeDominantMood,
  detectEmotionalToneShift,
  canTriggerToneShift,
  type Mood,
} from "../ambientAudioCache";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MOODS: readonly Mood[] = [
  "calm",
  "frustrated",
  "passionate",
  "defensive",
  "resigned",
];

// ─── Property 6: Cache staleness check ────────────────────────────────────────
// Validates: Requirements 4.4

describe("Property 6: Cache staleness check", () => {
  // Feature: elevenlabs-ambient-audio, Property 6
  it("isCacheStale returns true iff (now - generatedAt) > 90 days", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - NINETY_DAYS_MS - 1 }),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (generatedAt, now) => {
          const delta = now - generatedAt;
          const expected = delta > NINETY_DAYS_MS;
          return isCacheStale(generatedAt, now) === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exactly 90 days is NOT stale", () => {
    expect(isCacheStale(0, NINETY_DAYS_MS)).toBe(false);
  });

  it("90 days + 1ms IS stale", () => {
    expect(isCacheStale(0, NINETY_DAYS_MS + 1)).toBe(true);
  });
});

// ─── Property 7: Dominant mood computation ───────────────────────────────────
// Validates: Requirements 6.1

describe("Property 7: Dominant mood computation", () => {
  // Feature: elevenlabs-ambient-audio, Property 7
  it("computeDominantMood returns a mood with the highest frequency", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...MOODS), { minLength: 1, maxLength: 50 }),
        (moods) => {
          const result = computeDominantMood(moods);

          // Count frequencies
          const counts = new Map<Mood, number>();
          for (const m of moods) counts.set(m, (counts.get(m) ?? 0) + 1);

          const resultCount = counts.get(result) ?? 0;
          let maxCount = 0;
          for (const c of counts.values()) if (c > maxCount) maxCount = c;

          return resultCount === maxCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deterministic tie-break: returns first-seen mood among ties", () => {
    expect(computeDominantMood(["calm", "frustrated", "calm", "frustrated"])).toBe(
      "calm"
    );
    expect(computeDominantMood(["frustrated", "calm", "frustrated", "calm"])).toBe(
      "frustrated"
    );
  });
});

// ─── Property 8: Emotional tone shift detection and rate limiting ────────────
// Validates: Requirements 6.2, 6.6

describe("Property 8: Emotional tone shift detection and rate limiting", () => {
  // Feature: elevenlabs-ambient-audio, Property 8
  it(
    "detectEmotionalToneShift returns true iff last 3 == currentMood and 4th-from-end differs",
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...MOODS), { minLength: 0, maxLength: 20 }),
          fc.constantFrom(...MOODS),
          (history, currentMood) => {
            const result = detectEmotionalToneShift(history, currentMood);
            if (history.length < 4) return result === false;
            const len = history.length;
            const lastThreeMatch =
              history[len - 1] === currentMood &&
              history[len - 2] === currentMood &&
              history[len - 3] === currentMood;
            const fourthDiffers = history[len - 4] !== currentMood;
            const expected = lastThreeMatch && fourthDiffers;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it("canTriggerToneShift respects the 5-minute rate limit", () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - FIVE_MINUTES_MS - 1 })),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (lastShiftTimestamp, now) => {
          const result = canTriggerToneShift(lastShiftTimestamp, now);
          if (lastShiftTimestamp === null) return result === true;
          const expected = now - lastShiftTimestamp >= FIVE_MINUTES_MS;
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exactly 5 minutes elapsed CAN trigger shift", () => {
    expect(canTriggerToneShift(0, FIVE_MINUTES_MS)).toBe(true);
  });

  it("5 minutes minus 1ms CANNOT trigger shift", () => {
    expect(canTriggerToneShift(0, FIVE_MINUTES_MS - 1)).toBe(false);
  });
});
