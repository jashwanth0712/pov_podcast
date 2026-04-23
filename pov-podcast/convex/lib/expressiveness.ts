/**
 * Expressiveness validation for persona dialogue turns.
 *
 * A turn is considered expressive if it contains at least one of:
 * 1. An emotional statement (emotional keywords)
 * 2. A personal struggle reference (first-person + struggle words)
 * 3. An ideological assertion (ideological keywords)
 *
 * Requirements: 15.2
 */

const EMOTIONAL_KEYWORDS = [
  "feel",
  "felt",
  "emotion",
  "heart",
  "fear",
  "hope",
  "anger",
  "grief",
  "joy",
  "pain",
  "love",
  "hate",
  "afraid",
  "proud",
  "ashamed",
  "desperate",
  "horrified",
  "moved",
  "touched",
  "devastated",
];

const FIRST_PERSON_WORDS = ["i", "my", "me", "myself"];

const STRUGGLE_WORDS = [
  "struggle",
  "suffer",
  "lost",
  "watched",
  "witnessed",
  "survived",
  "endured",
  "faced",
  "lived through",
];

const IDEOLOGICAL_KEYWORDS = [
  "believe",
  "must",
  "should",
  "right",
  "wrong",
  "justice",
  "freedom",
  "duty",
  "principle",
  "truth",
  "moral",
  "values",
  "ideology",
  "stand for",
  "fight for",
];

/**
 * Returns true if the text contains an emotional keyword.
 */
function hasEmotionalStatement(lower: string): boolean {
  return EMOTIONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns true if the text contains a first-person struggle reference.
 * Requires both a first-person word and a struggle word.
 */
function hasPersonalStruggleReference(lower: string): boolean {
  const hasFirstPerson = FIRST_PERSON_WORDS.some((fp) => {
    // Match as whole word or at word boundary
    const regex = new RegExp(`\\b${fp}\\b`);
    return regex.test(lower);
  });
  if (!hasFirstPerson) return false;
  return STRUGGLE_WORDS.some((sw) => lower.includes(sw));
}

/**
 * Returns true if the text contains an ideological assertion keyword.
 */
function hasIdeologicalAssertion(lower: string): boolean {
  return IDEOLOGICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Validates that a dialogue turn text is expressive enough.
 *
 * Returns true if the text contains at least one of:
 * - An emotional statement
 * - A personal struggle reference
 * - An ideological assertion
 *
 * Returns false for empty strings or purely neutral factual content.
 *
 * Requirements: 15.2
 */
export function validateExpressiveness(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const lower = text.toLowerCase();

  return (
    hasEmotionalStatement(lower) ||
    hasPersonalStruggleReference(lower) ||
    hasIdeologicalAssertion(lower)
  );
}
