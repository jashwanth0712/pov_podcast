/**
 * Topic input validation for the Scenario Generator.
 *
 * Shared between the frontend (ScenarioGenerator component) and the
 * Convex backend (generateScenario action) to ensure consistent validation.
 *
 * Requirements: 2.2, 2.5
 */

export const TOPIC_MIN_LENGTH = 3;
export const TOPIC_MAX_LENGTH = 500;

export interface TopicValidationResult {
  valid: boolean;
  /** Non-empty when valid is false — contains human-readable error messages. */
  errors: string[];
  /** Convenience alias for the first error message (undefined when valid). */
  error?: string;
}

/**
 * Validates a scenario topic string.
 *
 * - Rejects topics shorter than 3 characters (Requirement 2.5)
 * - Rejects topics longer than 500 characters (Requirement 2.2)
 * - Accepts topics between 3 and 500 characters inclusive
 */
export function validateTopic(topic: string): TopicValidationResult {
  const errors: string[] = [];

  if (topic.length < TOPIC_MIN_LENGTH) {
    errors.push(`Topic must be at least ${TOPIC_MIN_LENGTH} characters long.`);
  } else if (topic.length > TOPIC_MAX_LENGTH) {
    errors.push(`Topic must be no more than ${TOPIC_MAX_LENGTH} characters long.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, error: errors[0] };
  }

  return { valid: true, errors: [] };
}

/**
 * Convenience helper — returns true if the topic passes validation.
 */
export function isTopicValid(topic: string): boolean {
  return validateTopic(topic).valid;
}
