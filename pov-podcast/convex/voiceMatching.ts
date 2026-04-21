/**
 * Voice Matching — selects the most appropriate ElevenLabs voice ID for a Persona
 * based on geographic/cultural origin, estimated age, and gender.
 *
 * Requirements: 2.6, 3.1
 *
 * ElevenLabs voice IDs are stable identifiers from the ElevenLabs voice library.
 * This mapping covers a broad range of geographic origins, ages, and genders.
 */

export interface VoiceMatchInput {
  geographicOrigin: string;
  estimatedAge: number;
  gender: string;
}

interface VoiceEntry {
  voiceId: string;
  name: string;
  gender: "male" | "female" | "neutral";
  ageGroup: "young" | "middle" | "old";
  regions: string[];
}

/**
 * Curated voice pool from ElevenLabs covering diverse geographic/cultural origins.
 * Voice IDs are real ElevenLabs voice library IDs.
 */
const VOICE_POOL: VoiceEntry[] = [
  // American English — male
  { voiceId: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", ageGroup: "middle", regions: ["american", "united states", "usa", "north america", "western"] },
  { voiceId: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", ageGroup: "middle", regions: ["american", "united states", "usa"] },
  { voiceId: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "male", ageGroup: "young", regions: ["american", "united states", "western"] },
  { voiceId: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", ageGroup: "young", regions: ["american", "united states", "north america"] },
  // American English — female
  { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "female", ageGroup: "young", regions: ["american", "united states", "usa", "north america", "western"] },
  { voiceId: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "female", ageGroup: "young", regions: ["american", "united states"] },
  { voiceId: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", gender: "female", ageGroup: "young", regions: ["american", "united states"] },
  // British English — male
  { voiceId: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", ageGroup: "middle", regions: ["british", "english", "uk", "united kingdom", "european", "colonial"] },
  { voiceId: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male", ageGroup: "young", regions: ["british", "uk", "scottish", "european"] },
  { voiceId: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", ageGroup: "young", regions: ["british", "uk", "australian", "new zealand"] },
  // British English — female
  { voiceId: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", gender: "female", ageGroup: "middle", regions: ["british", "uk", "european", "colonial"] },
  { voiceId: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", ageGroup: "young", regions: ["british", "uk", "european"] },
  // South Asian — male
  { voiceId: "g5CIjZEefAph4nQFvHAz", name: "Ethan", gender: "male", ageGroup: "young", regions: ["indian", "south asian", "india", "pakistan", "bangladesh", "sri lanka", "asian"] },
  { voiceId: "oWAxZDx7w5VEj9dCyTzz", name: "Grace", gender: "female", ageGroup: "young", regions: ["indian", "south asian", "india", "asian"] },
  // South Asian — female
  { voiceId: "z9fAnlkpzviPz146aGWa", name: "Glinda", gender: "female", ageGroup: "middle", regions: ["indian", "south asian", "india", "pakistan", "asian"] },
  // East Asian — male
  { voiceId: "SOYHLrjzK2X1ezoPC6cr", name: "Harry", gender: "male", ageGroup: "young", regions: ["east asian", "chinese", "japanese", "korean", "asian", "china", "japan", "korea"] },
  // East Asian — female
  { voiceId: "jsCqWAovK2LkecY7zXl4", name: "Freya", gender: "female", ageGroup: "young", regions: ["east asian", "chinese", "japanese", "korean", "asian"] },
  // European — male
  { voiceId: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "male", ageGroup: "young", regions: ["european", "german", "french", "italian", "spanish", "dutch", "polish", "russian", "soviet", "eastern european"] },
  { voiceId: "flq6f7yk4E4fJM5XTYuZ", name: "Michael", gender: "male", ageGroup: "old", regions: ["european", "german", "french", "italian", "russian", "soviet", "eastern european"] },
  // European — female
  { voiceId: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", ageGroup: "middle", regions: ["european", "german", "french", "italian", "spanish", "russian", "soviet"] },
  // African — male
  { voiceId: "GBv7mTt0atIp3Br8iCZE", name: "Thomas", gender: "male", ageGroup: "middle", regions: ["african", "nigerian", "south african", "kenyan", "ghanaian", "africa"] },
  // African — female
  { voiceId: "oB9CV7Lp1nBtFcdMdCgB", name: "Emily", gender: "female", ageGroup: "young", regions: ["african", "nigerian", "south african", "kenyan", "africa"] },
  // Middle Eastern — male
  { voiceId: "bVMeCyTHy58xNoL34h3p", name: "Jeremy", gender: "male", ageGroup: "middle", regions: ["middle eastern", "arab", "arabic", "iranian", "persian", "turkish", "israeli", "jewish"] },
  // Middle Eastern — female
  { voiceId: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "female", ageGroup: "young", regions: ["middle eastern", "arab", "arabic", "iranian", "turkish"] },
  // Latin American — male
  { voiceId: "CYw3kZ02Hs0563khs1Fj", name: "Dave", gender: "male", ageGroup: "middle", regions: ["latin american", "spanish", "mexican", "brazilian", "south american", "central american"] },
  // Latin American — female
  { voiceId: "LcfcDJNUP1GQjkzn1xUU", name: "Emily", gender: "female", ageGroup: "young", regions: ["latin american", "spanish", "mexican", "brazilian", "south american"] },
  // Older male voices (for elderly personas)
  { voiceId: "29vD33N1CtxCmqQRPOHJ", name: "Drew", gender: "male", ageGroup: "old", regions: ["american", "british", "western", "european"] },
  { voiceId: "D38z5RcWu1voky8WS1ja", name: "Patrick", gender: "male", ageGroup: "old", regions: ["american", "british", "western", "european", "colonial"] },
  // Older female voices
  { voiceId: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", gender: "female", ageGroup: "old", regions: ["american", "british", "western", "european"] },
  { voiceId: "t0jbNlBVZ17f02VDIeMI", name: "Serena", gender: "female", ageGroup: "old", regions: ["american", "british", "western", "european"] },
];

/** Default fallback voice IDs when no match is found */
const DEFAULT_MALE_VOICE = "pNInz6obpgDQGcFmaJgB"; // Adam
const DEFAULT_FEMALE_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Bella
const DEFAULT_NEUTRAL_VOICE = "pNInz6obpgDQGcFmaJgB"; // Adam

/**
 * Normalise a string for comparison: lowercase, trim, remove punctuation.
 */
function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
}

/**
 * Determine age group from estimated age.
 */
function ageGroup(age: number): "young" | "middle" | "old" {
  if (age < 35) return "young";
  if (age < 60) return "middle";
  return "old";
}

/**
 * Normalise gender string to "male" | "female" | "neutral".
 */
function normaliseGender(gender: string): "male" | "female" | "neutral" {
  const g = gender.toLowerCase().trim();
  if (g === "male" || g === "man" || g === "m") return "male";
  if (g === "female" || g === "woman" || g === "f") return "female";
  return "neutral";
}

/**
 * Score a voice entry against the desired attributes.
 * Higher score = better match.
 */
function scoreVoice(
  voice: VoiceEntry,
  desiredGender: "male" | "female" | "neutral",
  desiredAgeGroup: "young" | "middle" | "old",
  normalisedOrigin: string
): number {
  let score = 0;

  // Gender match (highest priority)
  if (desiredGender === "neutral") {
    score += 1; // any gender is fine
  } else if (voice.gender === desiredGender) {
    score += 3;
  }

  // Age group match
  if (voice.ageGroup === desiredAgeGroup) {
    score += 2;
  } else if (
    (voice.ageGroup === "young" && desiredAgeGroup === "middle") ||
    (voice.ageGroup === "middle" && desiredAgeGroup === "young") ||
    (voice.ageGroup === "middle" && desiredAgeGroup === "old") ||
    (voice.ageGroup === "old" && desiredAgeGroup === "middle")
  ) {
    score += 1; // adjacent age group
  }

  // Geographic/cultural origin match
  for (const region of voice.regions) {
    if (normalisedOrigin.includes(region) || region.includes(normalisedOrigin)) {
      score += 4;
      break;
    }
  }

  return score;
}

/**
 * Select the best matching ElevenLabs voice ID for a persona.
 *
 * Requirements: 2.6, 3.1
 */
export function matchVoice(input: VoiceMatchInput): string {
  const desiredGender = normaliseGender(input.gender);
  const desiredAgeGroup = ageGroup(input.estimatedAge);
  const normalisedOrigin = normalise(input.geographicOrigin);

  let bestVoice: VoiceEntry | null = null;
  let bestScore = -1;

  for (const voice of VOICE_POOL) {
    const score = scoreVoice(voice, desiredGender, desiredAgeGroup, normalisedOrigin);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  if (bestVoice) {
    return bestVoice.voiceId;
  }

  // Fallback by gender
  if (desiredGender === "female") return DEFAULT_FEMALE_VOICE;
  if (desiredGender === "male") return DEFAULT_MALE_VOICE;
  return DEFAULT_NEUTRAL_VOICE;
}
