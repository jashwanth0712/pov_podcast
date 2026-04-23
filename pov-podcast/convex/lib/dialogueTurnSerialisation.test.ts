// Feature: pov-podcast, Property 1: Dialogue Turn Serialisation Round-Trip
// Validates: Requirements 12.1, 12.2, 12.3

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serialiseDialogueTurn,
  deserialiseDialogueTurn,
  validateDialogueTurnDocument,
  type DialogueTurn,
  type DepthLevel,
} from "./dialogueTurnSerialisation";
import type { ArticleReference, EmotionalState } from "./promptAssembly";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const depthLevelArb: fc.Arbitrary<DepthLevel> = fc.constantFrom(
  "Casual",
  "Intermediate",
  "Scholar"
);

const moodArb: fc.Arbitrary<EmotionalState["mood"]> = fc.constantFrom(
  "calm",
  "frustrated",
  "passionate",
  "defensive",
  "resigned"
);

const emotionalStateArb: fc.Arbitrary<EmotionalState> = fc.record({
  mood: moodArb,
  convictionLevel: fc.float({ min: 0, max: 1, noNaN: true }),
  willingnessToConcede: fc.float({ min: 0, max: 1, noNaN: true }),
});

const articleReferenceArb: fc.Arbitrary<ArticleReference> = fc.record({
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  isVerified: fc.boolean(),
  isIllustrative: fc.boolean(),
  ideologicalAlignment: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Arbitrary for valid DialogueTurn objects.
 * Generates all required fields with appropriate constraints.
 */
const dialogueTurnArb: fc.Arbitrary<DialogueTurn> = fc.record({
  // speakerId represents persona IDs, "user", or "moderator"
  speakerId: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constant("user"),
    fc.constant("moderator")
  ),
  turnIndex: fc.nat(), // non-negative integer
  text: fc.string({ minLength: 1, maxLength: 500 }), // non-empty string
  audioUrl: fc.option(fc.webUrl(), { nil: null }),
  timestamp: fc.integer({ min: 1 }), // positive integer (Unix timestamp)
  sessionId: fc.string({ minLength: 1, maxLength: 50 }),
  branchId: fc.string({ minLength: 1, maxLength: 50 }),
  speakerName: fc.string({ minLength: 1, maxLength: 100 }),
  articleReferences: fc.array(articleReferenceArb, { minLength: 0, maxLength: 5 }),
  emotionalStateSnapshot: fc.option(emotionalStateArb, { nil: null }),
  qualityWarning: fc.boolean(),
  isUserInterruption: fc.boolean(),
  depthLevel: depthLevelArb,
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("serialiseDialogueTurn — unit tests", () => {
  it("maps speakerId to personaId in the serialised document", () => {
    const turn: DialogueTurn = {
      sessionId: "session-1",
      branchId: "branch-1",
      turnIndex: 0,
      speakerId: "persona-abc",
      speakerName: "Field Nurse",
      text: "I feel deeply troubled by what I have witnessed.",
      audioUrl: "https://example.com/audio.mp3",
      timestamp: 1700000000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };

    const doc = serialiseDialogueTurn(turn);
    expect(doc.personaId).toBe("persona-abc");
  });

  it("serialised document contains all required fields", () => {
    const turn: DialogueTurn = {
      sessionId: "session-1",
      branchId: "branch-1",
      turnIndex: 3,
      speakerId: "user",
      speakerName: "You",
      text: "What did the soldiers think?",
      audioUrl: null,
      timestamp: 1700000100,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: true,
      depthLevel: "Intermediate",
    };

    const doc = serialiseDialogueTurn(turn);
    expect(doc).toHaveProperty("personaId");
    expect(doc).toHaveProperty("turnIndex");
    expect(doc).toHaveProperty("text");
    expect(doc).toHaveProperty("audioUrl");
    expect(doc).toHaveProperty("timestamp");
  });

  it("audioUrl can be null in the serialised document", () => {
    const turn: DialogueTurn = {
      sessionId: "s",
      branchId: "b",
      turnIndex: 0,
      speakerId: "moderator",
      speakerName: "Moderator",
      text: "Let us consider another angle.",
      audioUrl: null,
      timestamp: 1700000200,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Scholar",
    };

    const doc = serialiseDialogueTurn(turn);
    expect(doc.audioUrl).toBeNull();
    expect("audioUrl" in doc).toBe(true);
  });

  it("round-trip: serialise → deserialise → serialise produces identical document", () => {
    const turn: DialogueTurn = {
      sessionId: "session-42",
      branchId: "branch-0",
      turnIndex: 7,
      speakerId: "persona-xyz",
      speakerName: "War Correspondent",
      text: "I believe the public deserves to know the full truth.",
      audioUrl: "https://cdn.example.com/turn-7.mp3",
      timestamp: 1700001000,
      articleReferences: [
        {
          url: "https://bbc.co.uk/archives/wwii",
          title: "BBC WWII Archives",
          isVerified: true,
          isIllustrative: false,
          ideologicalAlignment: "neutral",
        },
      ],
      emotionalStateSnapshot: {
        mood: "passionate",
        convictionLevel: 0.9,
        willingnessToConcede: 0.2,
      },
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Scholar",
    };

    const firstSerialised = serialiseDialogueTurn(turn);
    const deserialised = deserialiseDialogueTurn(firstSerialised as unknown as Record<string, unknown>);
    expect(deserialised.success).toBe(true);
    if (!deserialised.success) return;

    const secondSerialised = serialiseDialogueTurn(deserialised.data);
    expect(secondSerialised).toEqual(firstSerialised);
  });
});

describe("deserialiseDialogueTurn — unit tests", () => {
  it("maps personaId back to speakerId on deserialisation", () => {
    const doc = {
      personaId: "persona-abc",
      turnIndex: 0,
      text: "I feel deeply troubled.",
      audioUrl: null,
      timestamp: 1700000000,
      sessionId: "s",
      branchId: "b",
      speakerName: "Field Nurse",
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.speakerId).toBe("persona-abc");
  });

  it("returns error when personaId is missing", () => {
    const doc = {
      turnIndex: 0,
      text: "Some text",
      audioUrl: null,
      timestamp: 1700000000,
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("personaId");
  });

  it("returns error when turnIndex is missing", () => {
    const doc = {
      personaId: "p",
      text: "Some text",
      audioUrl: null,
      timestamp: 1700000000,
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("turnIndex");
  });

  it("returns error when text is missing", () => {
    const doc = {
      personaId: "p",
      turnIndex: 0,
      audioUrl: null,
      timestamp: 1700000000,
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("text");
  });

  it("returns error when timestamp is missing", () => {
    const doc = {
      personaId: "p",
      turnIndex: 0,
      text: "Some text",
      audioUrl: null,
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("timestamp");
  });

  it("accepts audioUrl as null (field present but null)", () => {
    const doc = {
      personaId: "p",
      turnIndex: 0,
      text: "Some text",
      audioUrl: null,
      timestamp: 1700000000,
    };

    const result = deserialiseDialogueTurn(doc);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.audioUrl).toBeNull();
  });
});

// ─── Property 1: Dialogue Turn Serialisation Round-Trip ──────────────────────
// Validates: Requirements 12.1, 12.2, 12.3

describe("Property 1: Dialogue Turn Serialisation Round-Trip", () => {
  it("serialised document always contains all required fields (Req 12.1)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        return (
          "personaId" in doc &&
          "turnIndex" in doc &&
          "text" in doc &&
          "audioUrl" in doc &&
          "timestamp" in doc
        );
      }),
      { numRuns: 100 }
    );
  });

  it("speakerId is always mapped to personaId in the serialised document (Req 12.1)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        return doc.personaId === turn.speakerId;
      }),
      { numRuns: 100 }
    );
  });

  it("deserialise(serialise(turn)) produces a turn equivalent to the original (Req 12.2)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        const result = deserialiseDialogueTurn(doc as unknown as Record<string, unknown>);

        if (!result.success) return false;

        const restored = result.data;
        return (
          restored.speakerId === turn.speakerId &&
          restored.turnIndex === turn.turnIndex &&
          restored.text === turn.text &&
          restored.audioUrl === turn.audioUrl &&
          restored.timestamp === turn.timestamp &&
          restored.sessionId === turn.sessionId &&
          restored.branchId === turn.branchId &&
          restored.speakerName === turn.speakerName &&
          restored.qualityWarning === turn.qualityWarning &&
          restored.isUserInterruption === turn.isUserInterruption &&
          restored.depthLevel === turn.depthLevel
        );
      }),
      { numRuns: 100 }
    );
  });

  it("serialise(deserialise(serialise(turn))) === serialise(turn) — round-trip property (Req 12.3)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const firstSerialised = serialiseDialogueTurn(turn);
        const deserialised = deserialiseDialogueTurn(
          firstSerialised as unknown as Record<string, unknown>
        );

        if (!deserialised.success) return false;

        const secondSerialised = serialiseDialogueTurn(deserialised.data);

        // Deep equality: both serialised documents must be identical
        return JSON.stringify(secondSerialised) === JSON.stringify(firstSerialised);
      }),
      { numRuns: 100 }
    );
  });

  it("serialisation is deterministic — same turn always produces same document (Req 12.3)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc1 = serialiseDialogueTurn(turn);
        const doc2 = serialiseDialogueTurn(turn);
        return JSON.stringify(doc1) === JSON.stringify(doc2);
      }),
      { numRuns: 100 }
    );
  });

  it("deserialisation is deterministic — same document always produces same turn (Req 12.2)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        const result1 = deserialiseDialogueTurn(doc as unknown as Record<string, unknown>);
        const result2 = deserialiseDialogueTurn(doc as unknown as Record<string, unknown>);

        if (!result1.success || !result2.success) return false;

        return JSON.stringify(result1.data) === JSON.stringify(result2.data);
      }),
      { numRuns: 100 }
    );
  });

  it("articleReferences are preserved through the round-trip (Req 12.2)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        const result = deserialiseDialogueTurn(doc as unknown as Record<string, unknown>);

        if (!result.success) return false;

        return (
          JSON.stringify(result.data.articleReferences) ===
          JSON.stringify(turn.articleReferences)
        );
      }),
      { numRuns: 100 }
    );
  });

  it("emotionalStateSnapshot is preserved through the round-trip (Req 12.2)", () => {
    fc.assert(
      fc.property(dialogueTurnArb, (turn) => {
        const doc = serialiseDialogueTurn(turn);
        const result = deserialiseDialogueTurn(doc as unknown as Record<string, unknown>);

        if (!result.success) return false;

        return (
          JSON.stringify(result.data.emotionalStateSnapshot) ===
          JSON.stringify(turn.emotionalStateSnapshot)
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Incomplete Dialogue Turn Documents Are Rejected ──────────────
// Feature: pov-podcast, Property 2: Incomplete Dialogue Turn Documents Are Rejected
// Validates: Requirement 12.4

const REQUIRED_FIELDS = ["personaId", "turnIndex", "text", "audioUrl", "timestamp"] as const;
type RequiredField = (typeof REQUIRED_FIELDS)[number];

/**
 * Arbitrary for a complete valid serialised dialogue turn document.
 * All 5 required fields are present.
 */
const completeDocArb: fc.Arbitrary<Record<string, unknown>> = fc.record({
  personaId: fc.string({ minLength: 1, maxLength: 50 }),
  turnIndex: fc.nat(),
  text: fc.string({ minLength: 1, maxLength: 500 }),
  audioUrl: fc.option(fc.webUrl(), { nil: null }),
  timestamp: fc.integer({ min: 1 }),
});

/**
 * Arbitrary that generates a complete document with at least one required field removed.
 * Returns both the incomplete document and the list of removed fields.
 */
const incompleteDocArb: fc.Arbitrary<{
  doc: Record<string, unknown>;
  removedFields: RequiredField[];
}> = fc
  .tuple(
    completeDocArb,
    // Pick a non-empty subset of required fields to remove
    fc
      .subarray([...REQUIRED_FIELDS] as RequiredField[], { minLength: 1 })
  )
  .map(([doc, fieldsToRemove]) => {
    const incomplete = { ...doc };
    for (const field of fieldsToRemove) {
      delete incomplete[field];
    }
    return { doc: incomplete, removedFields: fieldsToRemove };
  });

describe("Property 2: Incomplete Dialogue Turn Documents Are Rejected", () => {
  it("validateDialogueTurnDocument rejects any document missing at least one required field (Req 12.4)", () => {
    fc.assert(
      fc.property(incompleteDocArb, ({ doc, removedFields }) => {
        const result = validateDialogueTurnDocument(doc);
        // Must fail
        if (result.success) return false;
        // Error message must mention at least one of the removed field names
        return removedFields.some((field) => result.error.includes(field));
      }),
      { numRuns: 100 }
    );
  });

  it("deserialiseDialogueTurn rejects any document missing at least one required field (Req 12.4)", () => {
    fc.assert(
      fc.property(incompleteDocArb, ({ doc, removedFields }) => {
        const result = deserialiseDialogueTurn(doc);
        // Must fail
        if (result.success) return false;
        // Error message must mention at least one of the removed field names
        return removedFields.some((field) => result.error.includes(field));
      }),
      { numRuns: 100 }
    );
  });

  // ── Per-field rejection tests ─────────────────────────────────────────────

  it("rejects document missing 'personaId' with an error mentioning the field (Req 12.4)", () => {
    fc.assert(
      fc.property(completeDocArb, (doc) => {
        const incomplete = { ...doc };
        delete incomplete.personaId;
        const result = validateDialogueTurnDocument(incomplete);
        return !result.success && result.error.includes("personaId");
      }),
      { numRuns: 100 }
    );
  });

  it("rejects document missing 'turnIndex' with an error mentioning the field (Req 12.4)", () => {
    fc.assert(
      fc.property(completeDocArb, (doc) => {
        const incomplete = { ...doc };
        delete incomplete.turnIndex;
        const result = validateDialogueTurnDocument(incomplete);
        return !result.success && result.error.includes("turnIndex");
      }),
      { numRuns: 100 }
    );
  });

  it("rejects document missing 'text' with an error mentioning the field (Req 12.4)", () => {
    fc.assert(
      fc.property(completeDocArb, (doc) => {
        const incomplete = { ...doc };
        delete incomplete.text;
        const result = validateDialogueTurnDocument(incomplete);
        return !result.success && result.error.includes("text");
      }),
      { numRuns: 100 }
    );
  });

  it("rejects document missing 'audioUrl' key with an error mentioning the field (Req 12.4)", () => {
    fc.assert(
      fc.property(completeDocArb, (doc) => {
        const incomplete = { ...doc };
        delete incomplete.audioUrl;
        const result = validateDialogueTurnDocument(incomplete);
        return !result.success && result.error.includes("audioUrl");
      }),
      { numRuns: 100 }
    );
  });

  it("rejects document missing 'timestamp' with an error mentioning the field (Req 12.4)", () => {
    fc.assert(
      fc.property(completeDocArb, (doc) => {
        const incomplete = { ...doc };
        delete incomplete.timestamp;
        const result = validateDialogueTurnDocument(incomplete);
        return !result.success && result.error.includes("timestamp");
      }),
      { numRuns: 100 }
    );
  });

  it("accepts a complete document with audioUrl as null (key present, value null) (Req 12.4)", () => {
    fc.assert(
      fc.property(
        fc.record({
          personaId: fc.string({ minLength: 1, maxLength: 50 }),
          turnIndex: fc.nat(),
          text: fc.string({ minLength: 1, maxLength: 500 }),
          timestamp: fc.integer({ min: 1 }),
        }),
        (base) => {
          const doc = { ...base, audioUrl: null };
          const result = validateDialogueTurnDocument(doc);
          return result.success === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
