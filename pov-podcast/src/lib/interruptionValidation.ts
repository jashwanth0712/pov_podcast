/**
 * Interruption input validation for the Session Player.
 *
 * Shared between the frontend (TranscriptPanel / interruption input) and the
 * Convex backend (submitInterruption mutation) to ensure consistent validation.
 *
 * Requirements: 5.3, 5.8
 */

export const INTERRUPTION_MIN_LENGTH = 1;
export const INTERRUPTION_MAX_LENGTH = 1000;

export interface InterruptionValidationResult {
  valid: boolean;
  /** Non-empty when valid is false — contains human-readable error messages. */
  errors: string[];
  /** Convenience alias for the first error message (undefined when valid). */
  error?: string;
}

/**
 * Validates a user interruption input string.
 *
 * - Rejects empty strings (length 0) (Requirement 5.8)
 * - Rejects strings composed entirely of whitespace (Requirement 5.8)
 * - Rejects strings longer than 1000 characters (Requirement 5.3)
 * - Accepts strings with 1–1000 characters that contain at least one
 *   non-whitespace character (Requirement 5.3)
 */
export function validateInterruptionInput(
  text: string
): InterruptionValidationResult {
  const errors: string[] = [];

  if (text.length === 0) {
    errors.push("Interruption must contain at least 1 character.");
  } else if (text.trim().length === 0) {
    errors.push("Interruption must contain at least one non-whitespace character.");
  } else if (text.length > INTERRUPTION_MAX_LENGTH) {
    errors.push(
      `Interruption must be no more than ${INTERRUPTION_MAX_LENGTH} characters long.`
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors, error: errors[0] };
  }

  return { valid: true, errors: [] };
}

/**
 * Convenience helper — returns true if the interruption input passes validation.
 */
export function isInterruptionInputValid(text: string): boolean {
  return validateInterruptionInput(text).valid;
}
