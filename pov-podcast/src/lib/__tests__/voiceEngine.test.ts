// Feature: pov-podcast, Property 5: Emotional State Mapping to Voice Parameters
// Validates: Requirements 21.5

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  mapEmotionalStateToVoiceParams,
  type EmotionalState,
  type Mood,
  type VoiceParams,
} from "../voiceEngine";

// ─── Expected mapping table (Req 21.5) ───────────────────────────────────────

const EXPECTED_MAPPING: Record<Mood, Pick<VoiceParams, "stability" | "style">> = {
  calm:       { stability: 0.75, style: 0.20 },
  frustrated: { stability: 0.35, style: 0.80 },
  passionate: { stability: 0.45, style: 0.75 },
  defensive:  { stability: 0.55, style: 0.60 },
  resigned:   { stability: 0.80, style: 0.10 },
};

const ALL_MOODS: Mood[] = ["calm", "frustrated", "passionate", "defensive", "resigned"];

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const moodArb = fc.constantFrom<Mood>(...ALL_MOODS);

const emotionalStateArb: fc.Arbitrary<EmotionalState> = fc.record({
  mood: moodArb,
  convictionLevel: fc.float({ min: 0, max: 1, noNaN: true }),
  willingnessToConcede: fc.float({ min: 0, max: 1, noNaN: true }),
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("mapEmotionalStateToVoiceParams — unit tests", () => {
  describe("exact mapping values (Req 21.5)", () => {
    it("calm → stability 0.75, style 0.20", () => {
      const params = mapEmotionalStateToVoiceParams({
        mood: "calm",
        convictionLevel: 0.5,
        willingnessToConcede: 0.5,
      });
      expect(params.stability).toBe(0.75);
      expect(params.style).toBe(0.20);
    });

    it("frustrated → stability 0.35, style 0.80", () => {
      const params = mapEmotionalStateToVoiceParams({
        mood: "frustrated",
        convictionLevel: 0.8,
        willingnessToConcede: 0.1,
      });
      expect(params.stability).toBe(0.35);
      expect(params.style).toBe(0.80);
    });

    it("passionate → stability 0.45, style 0.75", () => {
      const params = mapEmotionalStateToVoiceParams({
        mood: "passionate",
        convictionLevel: 0.9,
        willingnessToConcede: 0.2,
      });
      expect(params.stability).toBe(0.45);
      expect(params.style).toBe(0.75);
    });

    it("defensive → stability 0.55, style 0.60", () => {
      const params = mapEmotionalStateToVoiceParams({
        mood: "defensive",
        convictionLevel: 0.6,
        willingnessToConcede: 0.3,
      });
      expect(params.stability).toBe(0.55);
      expect(params.style).toBe(0.60);
    });

    it("resigned → stability 0.80, style 0.10", () => {
      const params = mapEmotionalStateToVoiceParams({
        mood: "resigned",
        convictionLevel: 0.2,
        willingnessToConcede: 0.9,
      });
      expect(params.stability).toBe(0.80);
      expect(params.style).toBe(0.10);
    });
  });

  describe("fixed fields", () => {
    it("always sets similarity_boost to 0.75", () => {
      for (const mood of ALL_MOODS) {
        const params = mapEmotionalStateToVoiceParams({
          mood,
          convictionLevel: 0.5,
          willingnessToConcede: 0.5,
        });
        expect(params.similarity_boost).toBe(0.75);
      }
    });

    it("always sets model_id to 'eleven_flash_v2_5'", () => {
      for (const mood of ALL_MOODS) {
        const params = mapEmotionalStateToVoiceParams({
          mood,
          convictionLevel: 0.5,
          willingnessToConcede: 0.5,
        });
        expect(params.model_id).toBe("eleven_flash_v2_5");
      }
    });
  });

  describe("output range validation", () => {
    it("stability is always in [0.0, 1.0]", () => {
      for (const mood of ALL_MOODS) {
        const params = mapEmotionalStateToVoiceParams({
          mood,
          convictionLevel: 0.5,
          willingnessToConcede: 0.5,
        });
        expect(params.stability).toBeGreaterThanOrEqual(0.0);
        expect(params.stability).toBeLessThanOrEqual(1.0);
      }
    });

    it("style is always in [0.0, 1.0]", () => {
      for (const mood of ALL_MOODS) {
        const params = mapEmotionalStateToVoiceParams({
          mood,
          convictionLevel: 0.5,
          willingnessToConcede: 0.5,
        });
        expect(params.style).toBeGreaterThanOrEqual(0.0);
        expect(params.style).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("mapping is independent of conviction and willingness fields", () => {
    it("same mood with different convictionLevel produces same stability/style", () => {
      const base = mapEmotionalStateToVoiceParams({
        mood: "passionate",
        convictionLevel: 0.1,
        willingnessToConcede: 0.9,
      });
      const other = mapEmotionalStateToVoiceParams({
        mood: "passionate",
        convictionLevel: 0.9,
        willingnessToConcede: 0.1,
      });
      expect(base.stability).toBe(other.stability);
      expect(base.style).toBe(other.style);
    });
  });
});

// ─── Property 5: Emotional State Mapping to Voice Parameters ─────────────────
// Validates: Requirements 21.5

describe("Property 5: Emotional State Mapping to Voice Parameters", () => {
  it("every mood maps to the exact stability and style values specified in Req 21.5", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params = mapEmotionalStateToVoiceParams(state);
        const expected = EXPECTED_MAPPING[state.mood];
        return params.stability === expected.stability && params.style === expected.style;
      }),
      { numRuns: 100 }
    );
  });

  it("similarity_boost is always 0.75 regardless of mood (Req 21.5)", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params = mapEmotionalStateToVoiceParams(state);
        return params.similarity_boost === 0.75;
      }),
      { numRuns: 100 }
    );
  });

  it("model_id is always 'eleven_flash_v2_5' regardless of mood (Req 21.5)", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params = mapEmotionalStateToVoiceParams(state);
        return params.model_id === "eleven_flash_v2_5";
      }),
      { numRuns: 100 }
    );
  });

  it("stability is always in [0.0, 1.0] for any emotional state (Req 21.5)", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params = mapEmotionalStateToVoiceParams(state);
        return params.stability >= 0.0 && params.stability <= 1.0;
      }),
      { numRuns: 100 }
    );
  });

  it("style is always in [0.0, 1.0] for any emotional state (Req 21.5)", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params = mapEmotionalStateToVoiceParams(state);
        return params.style >= 0.0 && params.style <= 1.0;
      }),
      { numRuns: 100 }
    );
  });

  it("mapping is deterministic — same mood always produces same params (Req 21.5)", () => {
    fc.assert(
      fc.property(emotionalStateArb, (state) => {
        const params1 = mapEmotionalStateToVoiceParams(state);
        const params2 = mapEmotionalStateToVoiceParams(state);
        return (
          params1.stability === params2.stability &&
          params1.style === params2.style &&
          params1.similarity_boost === params2.similarity_boost &&
          params1.model_id === params2.model_id
        );
      }),
      { numRuns: 200 }
    );
  });

  it("mapping depends only on mood, not on convictionLevel or willingnessToConcede (Req 21.5)", () => {
    fc.assert(
      fc.property(
        moodArb,
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (mood, conviction1, concede1, conviction2, concede2) => {
          const params1 = mapEmotionalStateToVoiceParams({
            mood,
            convictionLevel: conviction1,
            willingnessToConcede: concede1,
          });
          const params2 = mapEmotionalStateToVoiceParams({
            mood,
            convictionLevel: conviction2,
            willingnessToConcede: concede2,
          });
          // Same mood → same stability and style regardless of other fields
          return params1.stability === params2.stability && params1.style === params2.style;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("different moods produce different stability/style combinations (Req 21.5)", () => {
    // Verify the mapping table has no duplicate stability+style pairs
    const pairs = ALL_MOODS.map((mood) => {
      const params = mapEmotionalStateToVoiceParams({
        mood,
        convictionLevel: 0.5,
        willingnessToConcede: 0.5,
      });
      return `${params.stability}:${params.style}`;
    });
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(ALL_MOODS.length);
  });

  it("frustrated has lower stability than calm (more expressive) (Req 21.5)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (conviction, concede) => {
          const frustrated = mapEmotionalStateToVoiceParams({
            mood: "frustrated",
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          const calm = mapEmotionalStateToVoiceParams({
            mood: "calm",
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          // Lower stability = more expressive (Req 21.5 design intent)
          return frustrated.stability < calm.stability;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("frustrated has higher style than calm (more expressive) (Req 21.5)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (conviction, concede) => {
          const frustrated = mapEmotionalStateToVoiceParams({
            mood: "frustrated",
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          const calm = mapEmotionalStateToVoiceParams({
            mood: "calm",
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          return frustrated.style > calm.style;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("resigned has the highest stability of all moods (Req 21.5)", () => {
    fc.assert(
      fc.property(
        moodArb.filter((m) => m !== "resigned"),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (otherMood, conviction, concede) => {
          const resigned = mapEmotionalStateToVoiceParams({
            mood: "resigned",
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          const other = mapEmotionalStateToVoiceParams({
            mood: otherMood,
            convictionLevel: conviction,
            willingnessToConcede: concede,
          });
          return resigned.stability >= other.stability;
        }
      ),
      { numRuns: 100 }
    );
  });
});
