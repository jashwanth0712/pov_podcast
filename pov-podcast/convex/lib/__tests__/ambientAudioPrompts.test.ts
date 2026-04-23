// Feature: elevenlabs-ambient-audio, Property 1
// Feature: elevenlabs-ambient-audio, Property 2

import { describe, it } from "vitest";
import fc from "fast-check";
import {
  buildEmotionalToneProfile,
  buildSoundEffectPrompt,
  countWords,
} from "../ambientAudioPrompts";

// ─── Property 1: Emotional Tone Profile word count ────────────────────────────
// Validates: Requirements 1.2

describe("Property 1: Emotional Tone Profile word count", () => {
  // Feature: elevenlabs-ambient-audio, Property 1
  it(
    "buildEmotionalToneProfile returns between 20 and 120 words for any valid Scenario input",
    () => {
      fc.assert(
        fc.property(
          // title
          fc.string({ minLength: 1 }),
          // era — constrained to the schema union type
          fc.constantFrom("Ancient", "Medieval", "Modern", "Contemporary"),
          // timePeriod
          fc.string({ minLength: 1 }),
          // description
          fc.string({ minLength: 1 }),
          // initialDialogueOutline
          fc.string({ minLength: 1 }),
          (title, era, timePeriod, description, initialDialogueOutline) => {
            const result = buildEmotionalToneProfile({
              title,
              era,
              timePeriod,
              description,
              initialDialogueOutline,
            });
            const wordCount = countWords(result);
            return wordCount >= 20 && wordCount <= 120;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 2: Sound Effect Prompt word count ───────────────────────────────
// Validates: Requirements 2.2

describe("Property 2: Sound Effect Prompt word count", () => {
  // Feature: elevenlabs-ambient-audio, Property 2
  it(
    "buildSoundEffectPrompt returns between 10 and 60 words for any valid Persona and Scenario input",
    () => {
      fc.assert(
        fc.property(
          // historicalRole
          fc.string({ minLength: 1 }),
          // geographicOrigin
          fc.string({ minLength: 1 }),
          // era — constrained to the schema union type
          fc.constantFrom("Ancient", "Medieval", "Modern", "Contemporary"),
          // title
          fc.string({ minLength: 1 }),
          (historicalRole, geographicOrigin, era, title) => {
            const result = buildSoundEffectPrompt(
              { historicalRole, geographicOrigin },
              { era, title }
            );
            const wordCount = countWords(result);
            return wordCount >= 10 && wordCount <= 60;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
