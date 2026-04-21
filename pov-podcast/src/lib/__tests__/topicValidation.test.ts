// Feature: pov-podcast, Property 9: Scenario Topic Input Validation
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateTopic,
  isTopicValid,
  TOPIC_MIN_LENGTH,
  TOPIC_MAX_LENGTH,
} from "../topicValidation";

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe("validateTopic — unit tests", () => {
  describe("valid topics", () => {
    it("accepts a topic of exactly 3 characters", () => {
      expect(validateTopic("abc").valid).toBe(true);
    });

    it("accepts a topic of exactly 500 characters", () => {
      expect(validateTopic("a".repeat(500)).valid).toBe(true);
    });

    it("accepts a typical topic", () => {
      expect(validateTopic("The Moon Landing").valid).toBe(true);
    });

    it("accepts a topic of 250 characters", () => {
      expect(validateTopic("a".repeat(250)).valid).toBe(true);
    });
  });

  describe("invalid topics — too short", () => {
    it("rejects empty string", () => {
      const result = validateTopic("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects a 1-character topic", () => {
      const result = validateTopic("a");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("3 characters"))).toBe(true);
    });

    it("rejects a 2-character topic", () => {
      const result = validateTopic("ab");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("3 characters"))).toBe(true);
    });
  });

  describe("invalid topics — too long", () => {
    it("rejects a 501-character topic", () => {
      const result = validateTopic("a".repeat(501));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("500 characters"))).toBe(true);
    });

    it("rejects a very long topic", () => {
      const result = validateTopic("a".repeat(1000));
      expect(result.valid).toBe(false);
    });
  });

  describe("isTopicValid helper", () => {
    it("returns true for valid topic", () => {
      expect(isTopicValid("The French Revolution")).toBe(true);
    });

    it("returns false for too-short topic", () => {
      expect(isTopicValid("ab")).toBe(false);
    });

    it("returns false for too-long topic", () => {
      expect(isTopicValid("a".repeat(501))).toBe(false);
    });
  });
});

// ─── Property-Based Tests ──────────────────────────────────────────────────────

/**
 * Property 9: Scenario Topic Input Validation
 * Validates: Requirements 2.2, 2.5
 *
 * For any topic string of length less than 3 characters, the scenario generator
 * input validator SHALL reject it with a validation error and SHALL NOT invoke
 * the generation action.
 *
 * For any topic string of length between 3 and 500 characters (inclusive),
 * the validator SHALL accept it and allow the generation action to proceed.
 */
describe("Property 9: Scenario Topic Input Validation", () => {
  it("rejects any topic shorter than 3 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: TOPIC_MIN_LENGTH - 1 }),
        (topic) => {
          const result = validateTopic(topic);
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts any topic between 3 and 500 characters (inclusive)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: TOPIC_MIN_LENGTH, maxLength: TOPIC_MAX_LENGTH }),
        (topic) => {
          const result = validateTopic(topic);
          return result.valid === true && result.errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any topic longer than 500 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: TOPIC_MAX_LENGTH + 1, maxLength: 1000 }),
        (topic) => {
          const result = validateTopic(topic);
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("isTopicValid is consistent with validateTopic", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 600 }), (topic) => {
        return isTopicValid(topic) === validateTopic(topic).valid;
      }),
      { numRuns: 200 }
    );
  });

  it("boundary: length exactly 3 is accepted", () => {
    fc.assert(
      fc.property(
        // Generate strings of exactly 3 chars
        fc.string({ minLength: 3, maxLength: 3 }),
        (topic) => {
          return validateTopic(topic).valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("boundary: length exactly 500 is accepted", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 500, maxLength: 500 }),
        (topic) => {
          return validateTopic(topic).valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
