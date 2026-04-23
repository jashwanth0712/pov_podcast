/**
 * Pure prompt-builder functions for ambient audio generation.
 *
 * Constructs natural-language prompts for the ElevenLabs Music API and
 * Sound Effects API from Scenario and Persona data. Both functions are
 * pure with no side effects, making them directly testable.
 *
 * Requirements: 1.2, 2.2
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScenarioPromptInput {
  title: string;
  era: string;
  timePeriod: string;
  description: string;
  initialDialogueOutline: string;
  dominantMood?: string;
}

export interface PersonaPromptInput {
  historicalRole: string;
  geographicOrigin: string;
}

export interface ScenarioContextInput {
  era: string;
  title: string;
}

// ─── Mood tone descriptors ────────────────────────────────────────────────────

const MOOD_TONE_DESCRIPTORS: Record<string, string> = {
  calm: "serene and contemplative, with a sense of quiet resolve",
  frustrated: "tense and strained, charged with suppressed conflict",
  passionate: "intense and stirring, alive with conviction and urgency",
  defensive: "guarded and uneasy, shadowed by suspicion and wariness",
  resigned: "melancholic and heavy, weighted by inevitability and loss",
};

function getMoodToneDescriptor(mood: string): string {
  const lower = mood.toLowerCase();
  return MOOD_TONE_DESCRIPTORS[lower] ?? `${mood} in emotional character`;
}

// ─── Word count utility ───────────────────────────────────────────────────────

/**
 * Counts words in a string by splitting on whitespace.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

// ─── buildEmotionalToneProfile ────────────────────────────────────────────────

/**
 * Constructs a 20–120 word natural-language prompt describing the historical
 * period, geographic setting, and dominant emotional atmosphere of a Scenario.
 *
 * The prompt is suitable for use with the ElevenLabs Music API. It does NOT
 * reference specific character names or plot details.
 *
 * Requirements: 1.2
 */
export function buildEmotionalToneProfile(scenario: ScenarioPromptInput): string {
  const { era, timePeriod, description, dominantMood } = scenario;

  // Build the core atmospheric description from the scenario fields.
  // We deliberately avoid title and initialDialogueOutline to prevent
  // character names or plot details from leaking into the music prompt.
  const moodClause = dominantMood
    ? `The emotional atmosphere is ${getMoodToneDescriptor(dominantMood)}.`
    : "The emotional atmosphere is reflective and historically grounded.";

  // Trim description to avoid runaway length — take first two sentences.
  const descriptionSentences = description
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ")
    .trim();

  const parts: string[] = [
    `An ambient musical backdrop for a historical setting in ${era}, during the period of ${timePeriod}.`,
    descriptionSentences
      ? `The scene is rooted in ${descriptionSentences.toLowerCase().replace(/^the\s+/i, "the ")}`
      : `The scene evokes the world of ${era}.`,
    moodClause,
    "The music should be non-melodic, atmospheric, and understated — supporting the spoken word without competing with it.",
  ];

  const candidate = parts.join(" ");

  // Enforce the 20–120 word contract by trimming or padding as needed.
  return enforceWordCount(candidate, 20, 120);
}

// ─── buildSoundEffectPrompt ───────────────────────────────────────────────────

/**
 * Constructs a 10–60 word ambient sound description for a Persona's physical
 * environment, suitable for use with the ElevenLabs Sound Effects API.
 *
 * Example output:
 *   "distant artillery fire and mud underfoot on a World War I trench,
 *    low rumble, non-melodic"
 *
 * Requirements: 2.2
 */
export function buildSoundEffectPrompt(
  persona: PersonaPromptInput,
  scenario: ScenarioContextInput
): string {
  const { historicalRole, geographicOrigin } = persona;
  const { era, title } = scenario;

  const parts: string[] = [
    `Ambient sound environment for a ${historicalRole} from ${geographicOrigin} during ${era}.`,
    `The setting is ${title}.`,
    "Low rumble, non-melodic, atmospheric background only.",
  ];

  const candidate = parts.join(" ");

  return enforceWordCount(candidate, 10, 60);
}

// ─── Word count enforcement ───────────────────────────────────────────────────

/**
 * Ensures the output string falls within [minWords, maxWords] (inclusive).
 *
 * - If the candidate is already within range, it is returned as-is.
 * - If it exceeds maxWords, words are trimmed from the end.
 * - If it falls below minWords, a filler phrase is appended until the
 *   minimum is reached.
 *
 * This is a safety net; well-formed inputs should produce in-range output
 * without needing adjustment.
 */
function enforceWordCount(candidate: string, minWords: number, maxWords: number): string {
  const words = candidate.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length > maxWords) {
    // Trim to maxWords, ensuring we end on a complete sentence where possible.
    const trimmed = words.slice(0, maxWords).join(" ");
    // Add a period if the last character is not punctuation.
    return trimmed.replace(/[^.!?,;]$/, (m) => m + ".");
  }

  if (words.length < minWords) {
    // Pad with a neutral filler phrase until we reach minWords.
    const filler = [
      "The soundscape is subtle and immersive.",
      "Ambient textures evoke the era.",
      "The atmosphere is historically authentic.",
      "Understated sonic detail grounds the scene.",
      "The audio environment is non-intrusive and period-appropriate.",
    ];
    let result = words.join(" ");
    let fillerIndex = 0;
    while (countWords(result) < minWords && fillerIndex < filler.length) {
      result = result + " " + filler[fillerIndex];
      fillerIndex++;
    }
    return result;
  }

  return candidate.trim();
}
