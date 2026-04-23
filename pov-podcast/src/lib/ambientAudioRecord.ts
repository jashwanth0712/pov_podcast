/**
 * AmbientAudioRecord — client-side serialisation format for a single ambient
 * audio artefact (music track or persona SFX clip).
 *
 * Requirements: 8.1, 8.4
 */

export interface AmbientAudioRecord {
  entityId: string;
  entityType: "scenario" | "persona";
  storageId: string;
  generationPrompt: string;
  generatedAt: number;
  moodLabel?: string;
}

export interface AmbientAudioValidationError {
  field: string;
  message: string;
}

/**
 * Returns a descriptive error object if any required field of `record` is
 * missing, null, or of the wrong type. Returns `null` when the record is valid.
 */
export function validateAmbientAudioRecord(
  record: unknown
): AmbientAudioValidationError | null {
  if (record === null || typeof record !== "object") {
    return { field: "<root>", message: "record must be a non-null object" };
  }
  const r = record as Record<string, unknown>;

  if (typeof r.entityId !== "string" || r.entityId.length === 0) {
    return { field: "entityId", message: "entityId must be a non-empty string" };
  }
  if (r.entityType !== "scenario" && r.entityType !== "persona") {
    return {
      field: "entityType",
      message: 'entityType must be "scenario" or "persona"',
    };
  }
  if (typeof r.storageId !== "string" || r.storageId.length === 0) {
    return { field: "storageId", message: "storageId must be a non-empty string" };
  }
  if (typeof r.generationPrompt !== "string" || r.generationPrompt.length === 0) {
    return {
      field: "generationPrompt",
      message: "generationPrompt must be a non-empty string",
    };
  }
  if (typeof r.generatedAt !== "number" || !Number.isFinite(r.generatedAt)) {
    return {
      field: "generatedAt",
      message: "generatedAt must be a finite number (ms since epoch)",
    };
  }
  if (
    r.moodLabel !== undefined &&
    (typeof r.moodLabel !== "string" || r.moodLabel.length === 0)
  ) {
    return {
      field: "moodLabel",
      message: "moodLabel, when present, must be a non-empty string",
    };
  }
  return null;
}
