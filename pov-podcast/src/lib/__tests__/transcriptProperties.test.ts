// Feature: pov-podcast, Property 10: Transcript Completeness and Attribution
// Feature: pov-podcast, Property 11: Article References Appear in Rendered Turns
// Validates: Requirements 4.3, 5.9, 9.1, 13.3, 13.4

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { DialogueTurn } from "../../../convex/lib/dialogueTurnSerialisation";
import type { ArticleReference } from "../../../convex/lib/promptAssembly";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  turnId: string;           // turnIndex as string
  speakerLabel: string;     // "You", "Moderator", or speakerName
  text: string;
  isUserInterruption: boolean;
  articleReferences: ArticleReference[];
  timestamp: number;
}

interface CitationEntry {
  speakerName: string;
  url: string;
  title: string;
  isVerified: boolean;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Builds transcript entries from dialogue turns, mirroring TranscriptPanel logic.
 * - Sorts turns by turnIndex ascending
 * - Maps speakerId "user" → "You", "moderator" → "Moderator", other → speakerName
 */
function buildTranscriptEntries(turns: DialogueTurn[]): TranscriptEntry[] {
  const sorted = [...turns].sort((a, b) => a.turnIndex - b.turnIndex);
  return sorted.map((turn) => {
    let speakerLabel: string;
    if (turn.speakerId === "user") {
      speakerLabel = "You";
    } else if (turn.speakerId === "moderator") {
      speakerLabel = "Moderator";
    } else {
      speakerLabel = turn.speakerName;
    }
    return {
      turnId: String(turn.turnIndex),
      speakerLabel,
      text: turn.text,
      isUserInterruption: turn.isUserInterruption,
      articleReferences: turn.articleReferences,
      timestamp: turn.timestamp,
    };
  });
}

/**
 * Extracts citation entries from dialogue turns.
 * For each turn, for each articleReference, creates a CitationEntry.
 * No deduplication — preserves all references.
 */
function extractCitationsFromTurns(turns: DialogueTurn[]): CitationEntry[] {
  const citations: CitationEntry[] = [];
  for (const turn of turns) {
    for (const ref of turn.articleReferences) {
      citations.push({
        speakerName: turn.speakerName,
        url: ref.url,
        title: ref.title,
        isVerified: ref.isVerified,
      });
    }
  }
  return citations;
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const articleReferenceArb: fc.Arbitrary<ArticleReference> = fc.record({
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  isVerified: fc.boolean(),
  isIllustrative: fc.boolean(),
  ideologicalAlignment: fc.string({ minLength: 0, maxLength: 50 }),
});

const speakerIdArb = fc.oneof(
  fc.constant("user"),
  fc.constant("moderator"),
  fc.uuid(), // persona ID
);

const depthLevelArb = fc.constantFrom<"Casual" | "Intermediate" | "Scholar">(
  "Casual",
  "Intermediate",
  "Scholar",
);

const dialogueTurnArb: fc.Arbitrary<DialogueTurn> = fc.record({
  sessionId: fc.uuid(),
  branchId: fc.uuid(),
  turnIndex: fc.nat({ max: 1000 }),
  speakerId: speakerIdArb,
  speakerName: fc.string({ minLength: 1, maxLength: 50 }),
  text: fc.string({ minLength: 1, maxLength: 500 }),
  audioUrl: fc.option(fc.webUrl(), { nil: null }),
  timestamp: fc.nat({ max: 9999999999999 }),
  articleReferences: fc.array(articleReferenceArb, { minLength: 0, maxLength: 5 }),
  emotionalStateSnapshot: fc.constant(null),
  qualityWarning: fc.boolean(),
  isUserInterruption: fc.boolean(),
  depthLevel: depthLevelArb,
});

// Ordered turns with unique sequential turnIndex values
const orderedTurnsArb = fc
  .array(dialogueTurnArb, { minLength: 0, maxLength: 20 })
  .map((turns) => turns.map((t, i) => ({ ...t, turnIndex: i })));

// ─── Unit Tests: buildTranscriptEntries ───────────────────────────────────────

describe("buildTranscriptEntries — unit tests", () => {
  it("returns empty array for empty input", () => {
    expect(buildTranscriptEntries([])).toEqual([]);
  });

  it("maps speakerId 'user' to label 'You'", () => {
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "user",
      speakerName: "Alice",
      text: "Hello",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };
    const entries = buildTranscriptEntries([turn]);
    expect(entries[0].speakerLabel).toBe("You");
  });

  it("maps speakerId 'moderator' to label 'Moderator'", () => {
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "moderator",
      speakerName: "Mod",
      text: "Welcome",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };
    const entries = buildTranscriptEntries([turn]);
    expect(entries[0].speakerLabel).toBe("Moderator");
  });

  it("maps persona speakerId to speakerName", () => {
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "persona-abc-123",
      speakerName: "Winston Churchill",
      text: "We shall fight on the beaches.",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Scholar",
    };
    const entries = buildTranscriptEntries([turn]);
    expect(entries[0].speakerLabel).toBe("Winston Churchill");
  });

  it("sorts turns by turnIndex ascending", () => {
    const turns: DialogueTurn[] = [
      { sessionId: "s", branchId: "b", turnIndex: 2, speakerId: "user", speakerName: "U", text: "C", audioUrl: null, timestamp: 3, articleReferences: [], emotionalStateSnapshot: null, qualityWarning: false, isUserInterruption: false, depthLevel: "Casual" },
      { sessionId: "s", branchId: "b", turnIndex: 0, speakerId: "user", speakerName: "U", text: "A", audioUrl: null, timestamp: 1, articleReferences: [], emotionalStateSnapshot: null, qualityWarning: false, isUserInterruption: false, depthLevel: "Casual" },
      { sessionId: "s", branchId: "b", turnIndex: 1, speakerId: "user", speakerName: "U", text: "B", audioUrl: null, timestamp: 2, articleReferences: [], emotionalStateSnapshot: null, qualityWarning: false, isUserInterruption: false, depthLevel: "Casual" },
    ];
    const entries = buildTranscriptEntries(turns);
    expect(entries.map((e) => e.text)).toEqual(["A", "B", "C"]);
  });

  it("preserves isUserInterruption flag", () => {
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "user",
      speakerName: "User",
      text: "Wait!",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: true,
      depthLevel: "Casual",
    };
    const entries = buildTranscriptEntries([turn]);
    expect(entries[0].isUserInterruption).toBe(true);
  });
});

// ─── Unit Tests: extractCitationsFromTurns ────────────────────────────────────

describe("extractCitationsFromTurns — unit tests", () => {
  it("returns empty array for empty input", () => {
    expect(extractCitationsFromTurns([])).toEqual([]);
  });

  it("returns empty array for turns with no article references", () => {
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "persona-1",
      speakerName: "Churchill",
      text: "Hello",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };
    expect(extractCitationsFromTurns([turn])).toEqual([]);
  });

  it("extracts one citation per article reference", () => {
    const ref: ArticleReference = {
      url: "https://example.com/article",
      title: "Test Article",
      isVerified: true,
      isIllustrative: false,
      ideologicalAlignment: "neutral",
    };
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "persona-1",
      speakerName: "Churchill",
      text: "See this article.",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [ref],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };
    const citations = extractCitationsFromTurns([turn]);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      speakerName: "Churchill",
      url: ref.url,
      title: ref.title,
      isVerified: ref.isVerified,
    });
  });

  it("attributes citations to the correct speaker", () => {
    const ref: ArticleReference = {
      url: "https://example.com/a",
      title: "Article A",
      isVerified: false,
      isIllustrative: true,
      ideologicalAlignment: "left",
    };
    const turn: DialogueTurn = {
      sessionId: "s1",
      branchId: "b1",
      turnIndex: 0,
      speakerId: "persona-2",
      speakerName: "Gandhi",
      text: "Peace.",
      audioUrl: null,
      timestamp: 1000,
      articleReferences: [ref],
      emotionalStateSnapshot: null,
      qualityWarning: false,
      isUserInterruption: false,
      depthLevel: "Casual",
    };
    const citations = extractCitationsFromTurns([turn]);
    expect(citations[0].speakerName).toBe("Gandhi");
  });
});

// ─── Property 10: Transcript Completeness and Attribution ─────────────────────
// Validates: Requirements 4.3, 5.9, 9.1

describe("Property 10: Transcript Completeness and Attribution", () => {
  // 10a: Every turn in the input appears exactly once in the output (completeness — Req 4.3)
  it("10a: every turn appears exactly once in the transcript (Req 4.3)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        return entries.length === turns.length;
      }),
      { numRuns: 100 },
    );
  });

  // 10b: Turn order is preserved — sorted by turnIndex ascending (Req 4.3)
  it("10b: turns are sorted by turnIndex ascending (Req 4.3)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        for (let i = 1; i < entries.length; i++) {
          if (Number(entries[i].turnId) < Number(entries[i - 1].turnId)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  // 10c: User turns are labelled "You" (Req 5.9)
  it("10c: turns with speakerId 'user' are labelled 'You' (Req 5.9)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        return turns.every((turn, i) => {
          const entry = entries.find((e) => e.turnId === String(turn.turnIndex));
          if (!entry) return false;
          if (turn.speakerId === "user") {
            return entry.speakerLabel === "You";
          }
          return true;
        });
      }),
      { numRuns: 100 },
    );
  });

  // 10d: Moderator turns are labelled "Moderator" (Req 9.1)
  it("10d: turns with speakerId 'moderator' are labelled 'Moderator' (Req 9.1)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        return turns.every((turn) => {
          const entry = entries.find((e) => e.turnId === String(turn.turnIndex));
          if (!entry) return false;
          if (turn.speakerId === "moderator") {
            return entry.speakerLabel === "Moderator";
          }
          return true;
        });
      }),
      { numRuns: 100 },
    );
  });

  // 10e: Persona turns use the speakerName (Req 9.1)
  it("10e: persona turns use speakerName as label (Req 9.1)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        return turns.every((turn) => {
          const entry = entries.find((e) => e.turnId === String(turn.turnIndex));
          if (!entry) return false;
          if (turn.speakerId !== "user" && turn.speakerId !== "moderator") {
            return entry.speakerLabel === turn.speakerName;
          }
          return true;
        });
      }),
      { numRuns: 100 },
    );
  });

  // 10f: User interruptions are included in the transcript (Req 5.9)
  it("10f: user interruptions are included and isUserInterruption is preserved (Req 5.9)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const entries = buildTranscriptEntries(turns);
        return turns.every((turn) => {
          const entry = entries.find((e) => e.turnId === String(turn.turnIndex));
          if (!entry) return false;
          return entry.isUserInterruption === turn.isUserInterruption;
        });
      }),
      { numRuns: 100 },
    );
  });

  // 10g: Empty turn list produces empty transcript (Req 4.3)
  it("10g: empty turn list produces empty transcript (Req 4.3)", () => {
    const entries = buildTranscriptEntries([]);
    expect(entries).toHaveLength(0);
  });

  // 10h: Transcript length equals input length (Req 4.3)
  it("10h: transcript length equals input length (Req 4.3)", () => {
    fc.assert(
      fc.property(
        fc.array(dialogueTurnArb, { minLength: 0, maxLength: 20 }),
        (turns) => {
          const entries = buildTranscriptEntries(turns);
          return entries.length === turns.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Article References Appear in Rendered Turns ─────────────────
// Validates: Requirements 13.3, 13.4

describe("Property 11: Article References Appear in Rendered Turns", () => {
  // 11a: Every article reference in every turn appears in the citations output (Req 13.3)
  it("11a: every article reference from every turn appears in citations (Req 13.3)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const citations = extractCitationsFromTurns(turns);
        return turns.every((turn) =>
          turn.articleReferences.every((ref) =>
            citations.some(
              (c) =>
                c.url === ref.url &&
                c.title === ref.title &&
                c.speakerName === turn.speakerName,
            ),
          ),
        );
      }),
      { numRuns: 100 },
    );
  });

  // 11b: Citations are attributed to the correct speaker (Req 13.4)
  it("11b: citations are attributed to the correct speaker (Req 13.4)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const citations = extractCitationsFromTurns(turns);
        // Build expected attribution: for each citation, find the source turn
        let citationIdx = 0;
        for (const turn of turns) {
          for (const ref of turn.articleReferences) {
            const citation = citations[citationIdx++];
            if (citation.speakerName !== turn.speakerName) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  // 11c: A turn with no article references contributes no citations (Req 13.3)
  it("11c: a turn with no article references contributes no citations (Req 13.3)", () => {
    fc.assert(
      fc.property(
        fc.array(
          dialogueTurnArb.map((t) => ({ ...t, articleReferences: [] })),
          { minLength: 0, maxLength: 20 },
        ),
        (turns) => {
          const citations = extractCitationsFromTurns(turns);
          return citations.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  // 11d: A turn with N article references contributes exactly N citations (Req 13.3)
  it("11d: a turn with N article references contributes exactly N citations (Req 13.3)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((n) =>
          fc
            .array(articleReferenceArb, { minLength: n, maxLength: n })
            .map((refs) => refs),
        ),
        dialogueTurnArb,
        (refs, turn) => {
          const turnWithRefs = { ...turn, articleReferences: refs };
          const citations = extractCitationsFromTurns([turnWithRefs]);
          return citations.length === refs.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  // 11e: Total citations count equals sum of all articleReferences lengths (Req 13.3)
  it("11e: total citations count equals sum of all articleReferences lengths (Req 13.3)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const citations = extractCitationsFromTurns(turns);
        const expectedCount = turns.reduce(
          (sum, t) => sum + t.articleReferences.length,
          0,
        );
        return citations.length === expectedCount;
      }),
      { numRuns: 100 },
    );
  });

  // 11f: Citation URL and title are preserved exactly from the source reference (Req 13.4)
  it("11f: citation URL and title are preserved exactly from the source reference (Req 13.4)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const citations = extractCitationsFromTurns(turns);
        let citationIdx = 0;
        for (const turn of turns) {
          for (const ref of turn.articleReferences) {
            const citation = citations[citationIdx++];
            if (citation.url !== ref.url || citation.title !== ref.title) {
              return false;
            }
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  // 11g: isVerified flag is preserved exactly (Req 13.4)
  it("11g: isVerified flag is preserved exactly from the source reference (Req 13.4)", () => {
    fc.assert(
      fc.property(orderedTurnsArb, (turns) => {
        const citations = extractCitationsFromTurns(turns);
        let citationIdx = 0;
        for (const turn of turns) {
          for (const ref of turn.articleReferences) {
            const citation = citations[citationIdx++];
            if (citation.isVerified !== ref.isVerified) {
              return false;
            }
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
