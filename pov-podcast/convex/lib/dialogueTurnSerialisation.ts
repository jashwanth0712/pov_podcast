/**
 * Dialogue turn serialisation and deserialisation.
 *
 * Provides:
 * - `serialiseDialogueTurn` — converts a dialogue turn object to a plain JSON-serialisable document
 * - `deserialiseDialogueTurn` — parses and validates a JSON document, returning a validated turn or a descriptive error
 * - `validateDialogueTurnDocument` — checks all required fields are present and returns descriptive errors
 *
 * The serialised format maps `speakerId` → `personaId` per Requirement 12.1.
 *
 * Required fields in the serialised document: `personaId`, `turnIndex`, `text`, `audioUrl`, `timestamp`
 * (`audioUrl` may be null but the field must be present)
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import type { ArticleReference, EmotionalState } from "./promptAssembly";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DepthLevel = "Casual" | "Intermediate" | "Scholar";

/**
 * The full dialogue turn object as stored in the Convex `dialogueTurns` table.
 * Uses `speakerId` as the internal field name.
 */
export interface DialogueTurn {
  sessionId: string;
  branchId: string;
  turnIndex: number;
  speakerId: string;          // Id<"personas"> | "user" | "moderator"
  speakerName: string;
  text: string;
  audioUrl: string | null;
  timestamp: number;
  articleReferences: ArticleReference[];
  emotionalStateSnapshot: EmotionalState | null;
  qualityWarning: boolean;
  isUserInterruption: boolean;
  depthLevel: DepthLevel;
}

/**
 * The serialised JSON document format.
 * Maps `speakerId` → `personaId` per Requirement 12.1.
 */
export interface SerialisedDialogueTurn {
  personaId: string;
  turnIndex: number;
  text: string;
  audioUrl: string | null;
  timestamp: number;
  // Additional fields preserved for full round-trip fidelity (Req 12.2)
  sessionId: string;
  branchId: string;
  speakerName: string;
  articleReferences: ArticleReference[];
  emotionalStateSnapshot: EmotionalState | null;
  qualityWarning: boolean;
  isUserInterruption: boolean;
  depthLevel: DepthLevel;
}

/**
 * Result type used throughout this module.
 * Either a success with data, or a failure with a descriptive error string.
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Required fields ──────────────────────────────────────────────────────────

/**
 * The set of required fields in a serialised dialogue turn document.
 * `audioUrl` is required to be present (but may be null).
 */
const REQUIRED_FIELDS = [
  "personaId",
  "turnIndex",
  "text",
  "audioUrl",
  "timestamp",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates that all required fields are present in a raw document object.
 *
 * Returns a success result with the validated document, or a failure result
 * with a descriptive error listing all missing fields.
 *
 * Note: `audioUrl` must be present as a key but may be null.
 *
 * Requirements: 12.4
 */
export function validateDialogueTurnDocument(
  doc: Record<string, unknown>
): Result<Record<string, unknown>> {
  const missingFields: RequiredField[] = [];

  for (const field of REQUIRED_FIELDS) {
    // `audioUrl` is allowed to be null, but the key must exist
    if (!(field in doc)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    const fieldList = missingFields.map((f) => `"${f}"`).join(", ");
    const plural = missingFields.length === 1 ? "field" : "fields";
    return {
      success: false,
      error: `Invalid dialogue turn document: missing required ${plural}: ${fieldList}`,
    };
  }

  return { success: true, data: doc };
}

// ─── Serialisation ────────────────────────────────────────────────────────────

/**
 * Serialises a dialogue turn object to a plain JSON-serialisable document.
 *
 * Maps `speakerId` → `personaId` per Requirement 12.1.
 * All other fields are preserved for full round-trip fidelity (Req 12.2).
 *
 * Requirements: 12.1, 12.2, 12.3
 */
export function serialiseDialogueTurn(turn: DialogueTurn): SerialisedDialogueTurn {
  return {
    // Required fields (Req 12.1) — speakerId mapped to personaId
    personaId: turn.speakerId,
    turnIndex: turn.turnIndex,
    text: turn.text,
    audioUrl: turn.audioUrl,
    timestamp: turn.timestamp,
    // Additional fields for full round-trip fidelity (Req 12.2)
    sessionId: turn.sessionId,
    branchId: turn.branchId,
    speakerName: turn.speakerName,
    articleReferences: turn.articleReferences,
    emotionalStateSnapshot: turn.emotionalStateSnapshot,
    qualityWarning: turn.qualityWarning,
    isUserInterruption: turn.isUserInterruption,
    depthLevel: turn.depthLevel,
  };
}

// ─── Deserialisation ──────────────────────────────────────────────────────────

/**
 * Deserialises and validates a raw JSON document into a `DialogueTurn` object.
 *
 * Validates all required fields are present before constructing the turn.
 * Returns a descriptive error and does NOT produce a turn object if any
 * required field is missing (Req 12.4).
 *
 * Maps `personaId` → `speakerId` (inverse of serialisation).
 *
 * Requirements: 12.2, 12.4
 */
export function deserialiseDialogueTurn(
  doc: Record<string, unknown>
): Result<DialogueTurn> {
  const validationResult = validateDialogueTurnDocument(doc);
  if (!validationResult.success) {
    return validationResult;
  }

  // At this point all required fields are present; cast with confidence.
  const validated = validationResult.data;

  const turn: DialogueTurn = {
    // Map personaId back to speakerId
    speakerId: validated.personaId as string,
    turnIndex: validated.turnIndex as number,
    text: validated.text as string,
    audioUrl: validated.audioUrl as string | null,
    timestamp: validated.timestamp as number,
    // Additional fields (fall back to safe defaults if absent for partial docs)
    sessionId: (validated.sessionId as string) ?? "",
    branchId: (validated.branchId as string) ?? "",
    speakerName: (validated.speakerName as string) ?? "",
    articleReferences: (validated.articleReferences as ArticleReference[]) ?? [],
    emotionalStateSnapshot: (validated.emotionalStateSnapshot as EmotionalState | null) ?? null,
    qualityWarning: (validated.qualityWarning as boolean) ?? false,
    isUserInterruption: (validated.isUserInterruption as boolean) ?? false,
    depthLevel: (validated.depthLevel as DepthLevel) ?? "Casual",
  };

  return { success: true, data: turn };
}
