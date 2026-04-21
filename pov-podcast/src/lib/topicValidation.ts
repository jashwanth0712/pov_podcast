/**
 * Scenario topic input validation.
 * Enforces: 3–500 characters (reject < 3 with error, reject > 500 with error).
 *
 * Requirements: 2.2, 2.5
 */
export interface TopicValidationResult {
  valid: boolean;
  errors: string[];
}

export const TOPIC_MIN_LENGTH = 3;
export const TOPIC_MAX_LENGTH = 500;

export function validateTopic(topic: string): TopicValidationResult {
  const errors: string[] = [];

  if (topic.length < TOPIC_MIN_LENGTH) {
    errors.push(
      `Topic must be at least ${TOPIC_MIN_LENGTH} characters long.`
    );
  } else if (topic.length > TOPIC_MAX_LENGTH) {
    errors.push(
      `Topic must be no more than ${TOPIC_MAX_LENGTH} characters long.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns true if the topic meets all length requirements.
 */
export function isTopicValid(topic: string): boolean {
  return validateTopic(topic).valid;
}
