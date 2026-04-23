// Feature: pov-podcast
// Property 6: Round Robin Turn-Taking Cycles Through All Personas (Req 14.3)
// Property 7: Random Turn-Taking Never Repeats Last Speaker (Req 14.4)
// Property 13: Deadlock Detection Fires on Repeated Positions (Req 17.1)

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  selectNextSpeakerRoundRobin,
  selectNextSpeakerRandom,
  detectDeadlock,
  selectNextSpeakerRelevance,
  type PersonaForScoring,
  type RelationshipForScoring,
  type EmotionalState,
} from "../../../convex/lib/turnTaking";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a non-empty array of unique persona ID strings */
const personaIdsArb = fc
  .array(fc.uuid(), { minLength: 2, maxLength: 6 })
  .map((ids) => [...new Set(ids)])
  .filter((ids) => ids.length >= 2);

/** Generates a valid round-robin index for a given persona list */
const roundRobinIndexArb = (personaIds: string[]) =>
  fc.integer({ min: 0, max: personaIds.length - 1 });

const moodArb = fc.constantFrom<EmotionalState["mood"]>(
  "calm", "frustrated", "passionate", "defensive", "resigned"
);

const emotionalStateArb: fc.Arbitrary<EmotionalState> = fc.record({
  mood: moodArb,
  convictionLevel: fc.float({ min: 0, max: 1, noNaN: true }),
  willingnessToConcede: fc.float({ min: 0, max: 1, noNaN: true }),
});

const personaForScoringArb: fc.Arbitrary<PersonaForScoring> = fc.record({
  personaId: fc.uuid(),
  emotionalState: emotionalStateArb,
  ideologicalPosition: fc.string({ minLength: 1, maxLength: 100 }),
});

// ─── Unit Tests: Round Robin ──────────────────────────────────────────────────

describe("selectNextSpeakerRoundRobin — unit tests", () => {
  it("returns the persona at the current index", () => {
    const ids = ["a", "b", "c"];
    const { personaId } = selectNextSpeakerRoundRobin(ids, 0);
    expect(personaId).toBe("a");
  });

  it("advances the index by 1", () => {
    const ids = ["a", "b", "c"];
    const { nextIndex } = selectNextSpeakerRoundRobin(ids, 0);
    expect(nextIndex).toBe(1);
  });

  it("wraps around at the end of the list", () => {
    const ids = ["a", "b", "c"];
    const { personaId, nextIndex } = selectNextSpeakerRoundRobin(ids, 2);
    expect(personaId).toBe("c");
    expect(nextIndex).toBe(0);
  });

  it("handles a single-persona list", () => {
    const ids = ["only"];
    const { personaId, nextIndex } = selectNextSpeakerRoundRobin(ids, 0);
    expect(personaId).toBe("only");
    expect(nextIndex).toBe(0);
  });

  it("throws on empty list", () => {
    expect(() => selectNextSpeakerRoundRobin([], 0)).toThrow();
  });

  it("handles index equal to list length (wraps)", () => {
    const ids = ["a", "b", "c"];
    const { personaId } = selectNextSpeakerRoundRobin(ids, 3);
    expect(personaId).toBe("a");
  });
});

// ─── Unit Tests: Random ───────────────────────────────────────────────────────

describe("selectNextSpeakerRandom — unit tests", () => {
  it("never returns the last speaker when there are alternatives", () => {
    const ids = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      const result = selectNextSpeakerRandom(ids, "a");
      expect(result).not.toBe("a");
    }
  });

  it("returns a valid persona ID from the list", () => {
    const ids = ["a", "b", "c"];
    const result = selectNextSpeakerRandom(ids, "a");
    expect(ids).toContain(result);
  });

  it("returns the only persona when there is one (even if they were last)", () => {
    const ids = ["only"];
    const result = selectNextSpeakerRandom(ids, "only");
    expect(result).toBe("only");
  });

  it("returns any persona when lastSpeakerId is null", () => {
    const ids = ["a", "b", "c"];
    const result = selectNextSpeakerRandom(ids, null);
    expect(ids).toContain(result);
  });

  it("throws on empty list", () => {
    expect(() => selectNextSpeakerRandom([], null)).toThrow();
  });
});

// ─── Unit Tests: Deadlock Detection ──────────────────────────────────────────

describe("detectDeadlock — unit tests", () => {
  it("returns false when fewer than 3 turns", () => {
    expect(
      detectDeadlock([
        { speakerId: "a", text: "I believe in freedom." },
        { speakerId: "b", text: "I believe in freedom." },
      ])
    ).toBe(false);
  });

  it("detects deadlock when same speaker repeats 3 times", () => {
    expect(
      detectDeadlock([
        { speakerId: "a", text: "We must fight for justice." },
        { speakerId: "a", text: "Justice is paramount." },
        { speakerId: "a", text: "I stand for justice always." },
      ])
    ).toBe(true);
  });

  it("detects deadlock when same keyword repeats across 3 turns", () => {
    expect(
      detectDeadlock([
        { speakerId: "a", text: "The revolution demands sacrifice." },
        { speakerId: "b", text: "The revolution cannot be stopped." },
        { speakerId: "c", text: "The revolution will succeed." },
      ])
    ).toBe(true);
  });

  it("returns false when speakers and keywords vary", () => {
    expect(
      detectDeadlock([
        { speakerId: "a", text: "I believe in freedom and democracy." },
        { speakerId: "b", text: "The economic situation is dire." },
        { speakerId: "c", text: "We must consider the human cost." },
      ])
    ).toBe(false);
  });

  it("uses custom threshold", () => {
    // With threshold=2, 2 identical speakers should trigger
    expect(
      detectDeadlock(
        [
          { speakerId: "a", text: "I believe in freedom." },
          { speakerId: "a", text: "Freedom is essential." },
        ],
        2
      )
    ).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(detectDeadlock([])).toBe(false);
  });

  it("only checks the last N turns (threshold)", () => {
    // First 3 turns have same speaker, but last 3 are varied — should NOT deadlock
    expect(
      detectDeadlock([
        { speakerId: "a", text: "I believe in freedom." },
        { speakerId: "a", text: "Freedom is essential." },
        { speakerId: "a", text: "We must fight for freedom." },
        { speakerId: "b", text: "The economic situation is dire." },
        { speakerId: "c", text: "We must consider the human cost." },
        { speakerId: "a", text: "I agree with the economic point." },
      ])
    ).toBe(false);
  });
});

// ─── Property 6: Round Robin Turn-Taking Cycles Through All Personas ──────────
// Validates: Requirements 14.3

describe("Property 6: Round Robin Turn-Taking Cycles Through All Personas", () => {
  it("cycling through all personas visits each exactly once per cycle (Req 14.3)", () => {
    fc.assert(
      fc.property(personaIdsArb, (personaIds) => {
        const visited: string[] = [];
        let currentIndex = 0;

        // Run one full cycle
        for (let i = 0; i < personaIds.length; i++) {
          const { personaId, nextIndex } = selectNextSpeakerRoundRobin(personaIds, currentIndex);
          visited.push(personaId);
          currentIndex = nextIndex;
        }

        // Every persona should have been visited exactly once
        const visitedSet = new Set(visited);
        return (
          visitedSet.size === personaIds.length &&
          personaIds.every((id) => visitedSet.has(id))
        );
      }),
      { numRuns: 100 }
    );
  });

  it("after a full cycle, the index returns to 0 (Req 14.3)", () => {
    fc.assert(
      fc.property(personaIdsArb, (personaIds) => {
        let currentIndex = 0;

        for (let i = 0; i < personaIds.length; i++) {
          const { nextIndex } = selectNextSpeakerRoundRobin(personaIds, currentIndex);
          currentIndex = nextIndex;
        }

        return currentIndex === 0;
      }),
      { numRuns: 100 }
    );
  });

  it("always returns a valid persona ID from the list (Req 14.3)", () => {
    fc.assert(
      fc.property(
        personaIdsArb,
        fc.integer({ min: 0, max: 1000 }),
        (personaIds, startIndex) => {
          const { personaId } = selectNextSpeakerRoundRobin(personaIds, startIndex);
          return personaIds.includes(personaId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("the sequence is deterministic — same index always produces same speaker (Req 14.3)", () => {
    fc.assert(
      fc.property(
        personaIdsArb,
        fc.integer({ min: 0, max: 100 }),
        (personaIds, index) => {
          const result1 = selectNextSpeakerRoundRobin(personaIds, index);
          const result2 = selectNextSpeakerRoundRobin(personaIds, index);
          return result1.personaId === result2.personaId && result1.nextIndex === result2.nextIndex;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("two consecutive cycles produce the same sequence (Req 14.3)", () => {
    fc.assert(
      fc.property(personaIdsArb, (personaIds) => {
        const runCycle = () => {
          const sequence: string[] = [];
          let idx = 0;
          for (let i = 0; i < personaIds.length; i++) {
            const { personaId, nextIndex } = selectNextSpeakerRoundRobin(personaIds, idx);
            sequence.push(personaId);
            idx = nextIndex;
          }
          return sequence;
        };

        const cycle1 = runCycle();
        const cycle2 = runCycle();

        return JSON.stringify(cycle1) === JSON.stringify(cycle2);
      }),
      { numRuns: 100 }
    );
  });

  it("nextIndex is always within bounds [0, personaIds.length) (Req 14.3)", () => {
    fc.assert(
      fc.property(
        personaIdsArb,
        fc.integer({ min: 0, max: 1000 }),
        (personaIds, index) => {
          const { nextIndex } = selectNextSpeakerRoundRobin(personaIds, index);
          return nextIndex >= 0 && nextIndex < personaIds.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: Random Turn-Taking Never Repeats Last Speaker ────────────────
// Validates: Requirements 14.4

describe("Property 7: Random Turn-Taking Never Repeats Last Speaker", () => {
  it("never returns the last speaker when there are 2+ personas (Req 14.4)", () => {
    fc.assert(
      fc.property(
        personaIdsArb,
        (personaIds) => {
          // Pick a random last speaker from the list
          const lastSpeakerIdx = Math.floor(Math.random() * personaIds.length);
          const lastSpeakerId = personaIds[lastSpeakerIdx];

          // Run 20 draws and verify none return the last speaker
          for (let i = 0; i < 20; i++) {
            const result = selectNextSpeakerRandom(personaIds, lastSpeakerId);
            if (result === lastSpeakerId) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("always returns a valid persona ID from the list (Req 14.4)", () => {
    fc.assert(
      fc.property(
        personaIdsArb,
        fc.option(fc.integer({ min: 0, max: 5 }), { nil: null }),
        (personaIds, lastIdx) => {
          const lastSpeakerId = lastIdx !== null ? (personaIds[lastIdx % personaIds.length] ?? null) : null;
          const result = selectNextSpeakerRandom(personaIds, lastSpeakerId);
          return personaIds.includes(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("with null lastSpeakerId, returns any valid persona (Req 14.4)", () => {
    fc.assert(
      fc.property(personaIdsArb, (personaIds) => {
        const result = selectNextSpeakerRandom(personaIds, null);
        return personaIds.includes(result);
      }),
      { numRuns: 100 }
    );
  });

  it("with a single persona, always returns that persona even if they were last (Req 14.4)", () => {
    fc.assert(
      fc.property(fc.uuid(), (personaId) => {
        const result = selectNextSpeakerRandom([personaId], personaId);
        return result === personaId;
      }),
      { numRuns: 50 }
    );
  });

  it("over many draws, all non-last personas are selected at least once (Req 14.4)", () => {
    fc.assert(
      fc.property(personaIdsArb, (personaIds) => {
        if (personaIds.length < 2) return true;

        const lastSpeakerId = personaIds[0];
        const candidates = personaIds.filter((id) => id !== lastSpeakerId);
        const selected = new Set<string>();

        // Run enough draws to expect all candidates to appear
        const draws = candidates.length * 50;
        for (let i = 0; i < draws; i++) {
          selected.add(selectNextSpeakerRandom(personaIds, lastSpeakerId));
        }

        // All candidates should have been selected at least once
        return candidates.every((id) => selected.has(id));
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 13: Deadlock Detection Fires on Repeated Positions ─────────────
// Validates: Requirements 17.1

describe("Property 13: Deadlock Detection Fires on Repeated Positions", () => {
  /** Generates a keyword of length > 4 */
  const keywordArb = fc.string({ minLength: 5, maxLength: 20 }).filter((s) =>
    /^[a-z]+$/.test(s)
  );

  it("detects deadlock when the same speaker appears in the last 3 turns (Req 17.1)", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (speakerId, text) => {
          const turns = [
            { speakerId, text: `${text} first` },
            { speakerId, text: `${text} second` },
            { speakerId, text: `${text} third` },
          ];
          return detectDeadlock(turns) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("detects deadlock when the same keyword appears in all last 3 turns (Req 17.1)", () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(fc.uuid(), { minLength: 3, maxLength: 3 }),
        (keyword, speakerIds) => {
          const turns = speakerIds.map((id, i) => ({
            speakerId: id,
            text: `The ${keyword} is central to this discussion turn ${i}.`,
          }));
          return detectDeadlock(turns) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("does NOT detect deadlock when speakers and keywords vary (Req 17.1)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 3, maxLength: 3 }).filter(
          (ids) => new Set(ids).size === 3
        ),
        (speakerIds) => {
          const turns = [
            { speakerId: speakerIds[0], text: "The economic situation requires attention." },
            { speakerId: speakerIds[1], text: "We must consider the human rights implications." },
            { speakerId: speakerIds[2], text: "Military strategy is the primary concern here." },
          ];
          return detectDeadlock(turns) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns false when fewer than threshold turns are provided (Req 17.1)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            speakerId: fc.uuid(),
            text: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 0, maxLength: 2 }
        ),
        (turns) => {
          return detectDeadlock(turns) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deadlock detection is deterministic — same input always produces same result (Req 17.1)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            speakerId: fc.uuid(),
            text: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (turns) => {
          const result1 = detectDeadlock(turns);
          const result2 = detectDeadlock(turns);
          return result1 === result2;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("adding more varied turns after a deadlock sequence resolves the deadlock (Req 17.1)", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 3, maxLength: 3 }).filter(
          (ids) => new Set(ids).size === 3
        ),
        (repeatedSpeaker, otherSpeakers) => {
          // First 3 turns: same speaker (deadlock)
          const deadlockTurns = [
            { speakerId: repeatedSpeaker, text: "I believe in freedom." },
            { speakerId: repeatedSpeaker, text: "Freedom is paramount." },
            { speakerId: repeatedSpeaker, text: "We must fight for freedom." },
          ];
          expect(detectDeadlock(deadlockTurns)).toBe(true);

          // Add 3 varied turns after — deadlock should be resolved
          const resolvedTurns = [
            ...deadlockTurns,
            { speakerId: otherSpeakers[0], text: "The economic situation is dire." },
            { speakerId: otherSpeakers[1], text: "We must consider the human cost." },
            { speakerId: otherSpeakers[2], text: "Military strategy is the primary concern." },
          ];
          return detectDeadlock(resolvedTurns) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Relevance Scoring: sanity checks ────────────────────────────────────────

describe("selectNextSpeakerRelevance — sanity checks", () => {
  it("never returns the last speaker when there are alternatives", () => {
    fc.assert(
      fc.property(
        fc.array(personaForScoringArb, { minLength: 2, maxLength: 6 }).map((arr) => {
          // Ensure unique IDs
          const seen = new Set<string>();
          return arr.filter((p) => {
            if (seen.has(p.personaId)) return false;
            seen.add(p.personaId);
            return true;
          });
        }).filter((arr) => arr.length >= 2),
        fc.string({ minLength: 1, maxLength: 200 }),
        (personas, lastTurnText) => {
          const lastSpeakerId = personas[0].personaId;
          const result = selectNextSpeakerRelevance(
            personas,
            lastSpeakerId,
            lastTurnText,
            []
          );
          return result !== lastSpeakerId;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("always returns a valid persona ID from the list", () => {
    fc.assert(
      fc.property(
        fc.array(personaForScoringArb, { minLength: 1, maxLength: 6 }).map((arr) => {
          const seen = new Set<string>();
          return arr.filter((p) => {
            if (seen.has(p.personaId)) return false;
            seen.add(p.personaId);
            return true;
          });
        }).filter((arr) => arr.length >= 1),
        fc.string({ minLength: 0, maxLength: 200 }),
        (personas, lastTurnText) => {
          const result = selectNextSpeakerRelevance(personas, null, lastTurnText, []);
          return personas.some((p) => p.personaId === result);
        }
      ),
      { numRuns: 100 }
    );
  });
});
