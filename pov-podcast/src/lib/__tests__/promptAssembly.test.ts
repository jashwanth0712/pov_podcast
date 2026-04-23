// Feature: pov-podcast, Property 15: Depth Level Is Present in Every Generation Prompt
// Validates: Requirements 19.3

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  assemblePersonaSystemPrompt,
  extractDepthLevelFromPrompt,
  getOtherDepthLevelMarkers,
  type DepthLevel,
  type PersonaPromptInput,
  type PromptContext,
  type EmotionalState,
  type ArticleReference,
  type PersonaRelationship,
} from "../../../convex/lib/promptAssembly";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const depthLevelArb = fc.constantFrom<DepthLevel>("Casual", "Intermediate", "Scholar");

const moodArb = fc.constantFrom<EmotionalState["mood"]>(
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

const articleRefArb: fc.Arbitrary<ArticleReference> = fc.record({
  url: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 80 }),
  isVerified: fc.boolean(),
  isIllustrative: fc.boolean(),
  ideologicalAlignment: fc.string({ minLength: 1, maxLength: 40 }),
});

const relationshipTypeArb = fc.constantFrom<PersonaRelationship["relationshipType"]>(
  "alliance",
  "rivalry",
  "mentor_student",
  "ideological_kinship",
  "historical_enmity"
);

const relationshipArb: fc.Arbitrary<PersonaRelationship> = fc.record({
  otherPersonaName: fc.string({ minLength: 1, maxLength: 40 }),
  relationshipType: relationshipTypeArb,
  description: fc.string({ minLength: 1, maxLength: 200 }),
});

/** Generates a valid PersonaPromptInput with at least 3 traits and 3 article refs */
const personaInputArb: fc.Arbitrary<PersonaPromptInput> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  historicalRole: fc.string({ minLength: 1, maxLength: 80 }),
  personalityTraits: fc.array(fc.string({ minLength: 1, maxLength: 40 }), {
    minLength: 3,
    maxLength: 8,
  }),
  emotionalBackstory: fc.string({ minLength: 200, maxLength: 2000 }),
  speakingStyle: fc.string({ minLength: 1, maxLength: 200 }),
  ideologicalPosition: fc.string({ minLength: 1, maxLength: 200 }),
  articleReferences: fc.array(articleRefArb, { minLength: 3, maxLength: 6 }),
  relationships: fc.array(relationshipArb, { minLength: 0, maxLength: 5 }),
});

/** Generates a PromptContext without a preceding speaker */
const promptContextArb: fc.Arbitrary<PromptContext> = fc.record({
  depthLevel: depthLevelArb,
  emotionalState: emotionalStateArb,
  precedingSpeakerName: fc.constant(undefined),
  precedingRelationship: fc.constant(undefined),
});

/** Generates a PromptContext with a preceding speaker and relationship */
const promptContextWithRelationshipArb: fc.Arbitrary<PromptContext> = fc.record({
  depthLevel: depthLevelArb,
  emotionalState: emotionalStateArb,
  precedingSpeakerName: fc.string({ minLength: 1, maxLength: 40 }),
  precedingRelationship: relationshipArb,
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("assemblePersonaSystemPrompt — unit tests", () => {
  const basePersona: PersonaPromptInput = {
    name: "Thomas Paine",
    historicalRole: "Political philosopher and pamphleteer",
    personalityTraits: ["radical", "eloquent", "uncompromising"],
    emotionalBackstory:
      "Thomas Paine arrived in America in 1774 with nothing but a letter of introduction from Benjamin Franklin. He had failed at every occupation England offered him — excise officer, corset maker, schoolteacher. But in America he found his voice. Common Sense, published in January 1776, sold 500,000 copies in a country of 2.5 million people. He argued not just for independence but for a new kind of government — one without kings, without hereditary privilege, built on reason and the rights of man. He was the first to use the phrase 'the United States of America.' Yet he died in poverty, shunned by the very republic he helped create, because he had also attacked organised religion in The Age of Reason. He is the revolution's most important forgotten founder.",
    speakingStyle: "Fiery, rhetorical, uses plain language to make radical ideas accessible",
    ideologicalPosition: "Democratic republican, anti-monarchist, deist",
    articleReferences: [
      {
        url: "https://en.wikipedia.org/wiki/Thomas_Paine",
        title: "Thomas Paine",
        isVerified: true,
        isIllustrative: false,
        ideologicalAlignment: "sympathetic",
      },
      {
        url: "https://en.wikipedia.org/wiki/Common_Sense_(pamphlet)",
        title: "Common Sense",
        isVerified: true,
        isIllustrative: false,
        ideologicalAlignment: "primary source",
      },
      {
        url: "https://en.wikipedia.org/wiki/The_Age_of_Reason",
        title: "The Age of Reason",
        isVerified: true,
        isIllustrative: false,
        ideologicalAlignment: "deist",
      },
    ],
    relationships: [],
  };

  it("includes the CASUAL depth level marker for Casual depth", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Casual",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).toContain("DEPTH LEVEL: CASUAL");
  });

  it("includes the INTERMEDIATE depth level marker for Intermediate depth", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).toContain("DEPTH LEVEL: INTERMEDIATE");
  });

  it("includes the SCHOLAR depth level marker for Scholar depth", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Scholar",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).toContain("DEPTH LEVEL: SCHOLAR");
  });

  it("does not include other depth level markers when Casual is selected", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Casual",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).not.toContain("DEPTH LEVEL: INTERMEDIATE");
    expect(prompt).not.toContain("DEPTH LEVEL: SCHOLAR");
  });

  it("does not include other depth level markers when Scholar is selected", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Scholar",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).not.toContain("DEPTH LEVEL: CASUAL");
    expect(prompt).not.toContain("DEPTH LEVEL: INTERMEDIATE");
  });

  it("includes persona name and historical role", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).toContain("Thomas Paine");
    expect(prompt).toContain("Political philosopher and pamphleteer");
  });

  it("includes all personality traits", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    for (const trait of basePersona.personalityTraits) {
      expect(prompt).toContain(trait);
    }
  });

  it("includes article reference titles", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    for (const ref of basePersona.articleReferences) {
      expect(prompt).toContain(ref.title);
    }
  });

  it("includes emotional state mood description", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "frustrated", convictionLevel: 0.8, willingnessToConcede: 0.2 },
    });
    expect(prompt).toContain("frustrated");
    expect(prompt).toContain("CURRENT EMOTIONAL STATE");
  });

  it("includes relationship tone modifier when preceding speaker and relationship are provided", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
      precedingSpeakerName: "John Adams",
      precedingRelationship: {
        otherPersonaName: "John Adams",
        relationshipType: "rivalry",
        description: "Paine and Adams disagreed fundamentally on the nature of democracy.",
      },
    });
    expect(prompt).toContain("RELATIONSHIP TONE MODIFIER");
    expect(prompt).toContain("John Adams");
    expect(prompt).toContain("rival");
  });

  it("does not include relationship tone modifier when no preceding speaker", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Intermediate",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(prompt).not.toContain("RELATIONSHIP TONE MODIFIER");
  });

  it("extractDepthLevelFromPrompt correctly identifies Casual", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Casual",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(extractDepthLevelFromPrompt(prompt)).toBe("Casual");
  });

  it("extractDepthLevelFromPrompt correctly identifies Scholar", () => {
    const prompt = assemblePersonaSystemPrompt(basePersona, {
      depthLevel: "Scholar",
      emotionalState: { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 },
    });
    expect(extractDepthLevelFromPrompt(prompt)).toBe("Scholar");
  });

  it("extractDepthLevelFromPrompt returns null for a prompt with no depth marker", () => {
    expect(extractDepthLevelFromPrompt("This is a plain string with no depth marker.")).toBeNull();
  });
});

// ─── Property 15: Depth Level Is Present in Every Generation Prompt ───────────
// Validates: Requirements 19.3

describe("Property 15: Depth Level Is Present in Every Generation Prompt", () => {
  it("every assembled prompt contains exactly the correct depth level marker (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb,
        promptContextArb,
        (persona, context) => {
          const prompt = assemblePersonaSystemPrompt(persona, context);
          const extracted = extractDepthLevelFromPrompt(prompt);

          // The extracted depth level must match the requested one
          return extracted === context.depthLevel;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no other depth level markers appear in the prompt (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb,
        promptContextArb,
        (persona, context) => {
          const prompt = assemblePersonaSystemPrompt(persona, context);
          const otherMarkers = getOtherDepthLevelMarkers(context.depthLevel);

          // None of the other depth level markers should appear
          return otherMarkers.every((marker) => !prompt.includes(marker));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("depth level marker is present even when persona has no relationships (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb.map((p) => ({ ...p, relationships: [] })),
        depthLevelArb,
        emotionalStateArb,
        (persona, depthLevel, emotionalState) => {
          const prompt = assemblePersonaSystemPrompt(persona, {
            depthLevel,
            emotionalState,
          });
          return extractDepthLevelFromPrompt(prompt) === depthLevel;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("depth level marker is present when a preceding speaker relationship is included (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb,
        promptContextWithRelationshipArb,
        (persona, context) => {
          const prompt = assemblePersonaSystemPrompt(persona, context);
          return extractDepthLevelFromPrompt(prompt) === context.depthLevel;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("depth level marker is present across all three depth levels for any persona (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb,
        emotionalStateArb,
        (persona, emotionalState) => {
          const levels: DepthLevel[] = ["Casual", "Intermediate", "Scholar"];
          return levels.every((depthLevel) => {
            const prompt = assemblePersonaSystemPrompt(persona, {
              depthLevel,
              emotionalState,
            });
            return extractDepthLevelFromPrompt(prompt) === depthLevel;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("depth level marker is present regardless of emotional state mood (Req 19.3)", () => {
    fc.assert(
      fc.property(
        personaInputArb,
        depthLevelArb,
        moodArb,
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (persona, depthLevel, mood, conviction, concede) => {
          const prompt = assemblePersonaSystemPrompt(persona, {
            depthLevel,
            emotionalState: {
              mood,
              convictionLevel: conviction,
              willingnessToConcede: concede,
            },
          });
          return extractDepthLevelFromPrompt(prompt) === depthLevel;
        }
      ),
      { numRuns: 100 }
    );
  });
});
