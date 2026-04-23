// Feature: pov-podcast, Property 3: Interruption Input Validation Boundaries
// Validates: Requirements 5.3, 5.8

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateInterruptionInput,
  isInterruptionInputValid,
  INTERRUPTION_MIN_LENGTH,
  INTERRUPTION_MAX_LENGTH,
} from "../interruptionValidation";

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe("validateInterruptionInput — unit tests", () => {
  describe("valid inputs", () => {
    it("accepts a single non-whitespace character", () => {
      expect(validateInterruptionInput("a").valid).toBe(true);
    });

    it("accepts a typical question", () => {
      expect(validateInterruptionInput("What did you think about that?").valid).toBe(true);
    });

    it("accepts exactly 1000 characters", () => {
      expect(validateInterruptionInput("a".repeat(1000)).valid).toBe(true);
    });

    it("accepts a string with leading/trailing whitespace but non-whitespace content", () => {
      expect(validateInterruptionInput("  hello  ").valid).toBe(true);
    });

    it("accepts a string with mixed whitespace and content", () => {
      expect(validateInterruptionInput("  a  ").valid).toBe(true);
    });
  });

  describe("invalid inputs — empty string", () => {
    it("rejects empty string", () => {
      const result = validateInterruptionInput("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.error).toBeDefined();
    });
  });

  describe("invalid inputs — whitespace only", () => {
    it("rejects a single space", () => {
      const result = validateInterruptionInput(" ");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects a string of only spaces", () => {
      const result = validateInterruptionInput("     ");
      expect(result.valid).toBe(false);
    });

    it("rejects a string of only tabs", () => {
      const result = validateInterruptionInput("\t\t\t");
      expect(result.valid).toBe(false);
    });

    it("rejects a string of only newlines", () => {
      const result = validateInterruptionInput("\n\n\n");
      expect(result.valid).toBe(false);
    });

    it("rejects a mixed whitespace-only string", () => {
      const result = validateInterruptionInput(" \t \n ");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid inputs — too long", () => {
    it("rejects a 1001-character string", () => {
      const result = validateInterruptionInput("a".repeat(1001));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("1000 characters"))).toBe(true);
    });

    it("rejects a very long string", () => {
      const result = validateInterruptionInput("a".repeat(5000));
      expect(result.valid).toBe(false);
    });
  });

  describe("error shape when invalid", () => {
    it("errors array is non-empty when valid is false", () => {
      const result = validateInterruptionInput("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("error field is defined when valid is false", () => {
      const result = validateInterruptionInput("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("error field equals the first element of errors array", () => {
      const result = validateInterruptionInput("");
      expect(result.error).toBe(result.errors[0]);
    });

    it("errors array is empty when valid is true", () => {
      const result = validateInterruptionInput("hello");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("error field is undefined when valid is true", () => {
      const result = validateInterruptionInput("hello");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("isInterruptionInputValid helper", () => {
    it("returns true for a valid input", () => {
      expect(isInterruptionInputValid("Hello there")).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isInterruptionInputValid("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isInterruptionInputValid("   ")).toBe(false);
    });

    it("returns false for too-long string", () => {
      expect(isInterruptionInputValid("a".repeat(1001))).toBe(false);
    });
  });
});

// ─── Property-Based Tests ──────────────────────────────────────────────────────

/**
 * Property 3: Interruption Input Validation Boundaries
 * Validates: Requirements 5.3, 5.8
 *
 * The interruption input validator SHALL:
 * - Reject empty strings (Req 5.8)
 * - Reject strings composed entirely of whitespace (Req 5.8)
 * - Reject strings longer than 1000 characters (Req 5.3)
 * - Accept strings of 1–1000 characters that contain at least one non-whitespace character (Req 5.3)
 * - Always include a non-empty errors array and a defined error field when valid is false
 */
describe("Property 3: Interruption Input Validation Boundaries", () => {
  /**
   * Arbitrary that generates strings composed entirely of whitespace characters
   * (spaces, tabs, newlines, carriage returns).
   */
  const whitespaceOnlyArb = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 100 })
    .map((chars) => chars.join(""));

  /**
   * Arbitrary that generates valid interruption strings:
   * 1–1000 characters with at least one non-whitespace character.
   */
  const validInterruptionArb = fc
    .tuple(
      // At least one non-whitespace character
      fc.string({ minLength: 1, maxLength: 1, unit: "grapheme-ascii" }).filter(
        (c) => c.trim().length > 0
      ),
      // Optional surrounding content (may be empty or whitespace)
      fc.string({ minLength: 0, maxLength: 998, unit: "grapheme-ascii" })
    )
    .map(([nonWs, rest]) => nonWs + rest)
    .filter(
      (s) =>
        s.length >= INTERRUPTION_MIN_LENGTH &&
        s.length <= INTERRUPTION_MAX_LENGTH &&
        s.trim().length > 0
    );

  // Property 3a: Empty string is always rejected (Req 5.8)
  it("3a: empty string is always rejected (Req 5.8)", () => {
    const result = validateInterruptionInput("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.error).toBeDefined();
  });

  // Property 3b: Whitespace-only strings are always rejected (Req 5.8)
  it("3b: whitespace-only strings are always rejected (Req 5.8)", () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (input) => {
        const result = validateInterruptionInput(input);
        return result.valid === false && result.errors.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  // Property 3c: Strings over 1000 characters are always rejected (Req 5.3)
  it("3c: strings over 1000 characters are always rejected (Req 5.3)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: INTERRUPTION_MAX_LENGTH + 1, maxLength: 2000, unit: "grapheme-ascii" }),
        (input) => {
          const result = validateInterruptionInput(input);
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3d: Valid strings (1–1000 chars with at least one non-whitespace) are accepted (Req 5.3)
  it("3d: strings of 1–1000 chars with at least one non-whitespace character are accepted (Req 5.3)", () => {
    fc.assert(
      fc.property(validInterruptionArb, (input) => {
        const result = validateInterruptionInput(input);
        return result.valid === true && result.errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  // Property 3e: When valid is false, errors array is non-empty and error is defined (Req 5.3, 5.8)
  it("3e: when valid is false, errors array is non-empty and error is defined (Req 5.3, 5.8)", () => {
    // Test across all invalid categories: empty, whitespace-only, too long
    const invalidInputArb = fc.oneof(
      // Empty string
      fc.constant(""),
      // Whitespace-only
      whitespaceOnlyArb,
      // Too long
      fc.string({ minLength: INTERRUPTION_MAX_LENGTH + 1, maxLength: 2000, unit: "grapheme-ascii" })
    );

    fc.assert(
      fc.property(invalidInputArb, (input) => {
        const result = validateInterruptionInput(input);
        if (result.valid === false) {
          return result.errors.length > 0 && result.error !== undefined;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Property 3f: isInterruptionInputValid is consistent with validateInterruptionInput
  it("3f: isInterruptionInputValid is consistent with validateInterruptionInput", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 1200, unit: "grapheme-ascii" }),
        (input) => {
          return isInterruptionInputValid(input) === validateInterruptionInput(input).valid;
        }
      ),
      { numRuns: 200 }
    );
  });

  // Property 3g: Boundary — exactly 1 non-whitespace character is accepted (Req 5.3)
  it("3g: boundary — exactly 1 non-whitespace character is accepted (Req 5.3)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1, unit: "grapheme-ascii" }).filter(
          (c) => c.trim().length > 0
        ),
        (input) => {
          return validateInterruptionInput(input).valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3h: Boundary — exactly 1000 characters with non-whitespace content is accepted (Req 5.3)
  it("3h: boundary — exactly 1000 characters with non-whitespace content is accepted (Req 5.3)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 999, maxLength: 999, unit: "grapheme-ascii" })
          .map((s) => "a" + s) // ensure at least one non-whitespace char, total = 1000
          .filter((s) => s.length === 1000 && s.trim().length > 0),
        (input) => {
          return validateInterruptionInput(input).valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3i: Boundary — exactly 1001 characters is always rejected (Req 5.3)
  it("3i: boundary — exactly 1001 characters is always rejected (Req 5.3)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1000, maxLength: 1000, unit: "grapheme-ascii" })
          .map((s) => "a" + s) // total = 1001
          .filter((s) => s.length === 1001),
        (input) => {
          return validateInterruptionInput(input).valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
