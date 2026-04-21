// Feature: pov-podcast, Property 12: Password Complexity Validation
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validatePassword, isPasswordValid } from "../passwordValidation";

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe("validatePassword — unit tests", () => {
  describe("valid passwords", () => {
    it("accepts a password meeting all requirements", () => {
      expect(validatePassword("Password1").valid).toBe(true);
    });

    it("accepts a longer complex password", () => {
      expect(validatePassword("MySecure123!").valid).toBe(true);
    });

    it("accepts exactly 8 characters with all requirements", () => {
      expect(validatePassword("Abcdef1g").valid).toBe(true);
    });

    it("accepts passwords with special characters", () => {
      expect(validatePassword("P@ssw0rd").valid).toBe(true);
    });
  });

  describe("invalid passwords — too short", () => {
    it("rejects empty string", () => {
      const result = validatePassword("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects 7-character password", () => {
      const result = validatePassword("Abc1234");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("8 characters"))).toBe(true);
    });
  });

  describe("invalid passwords — missing uppercase", () => {
    it("rejects password with no uppercase letter", () => {
      const result = validatePassword("password1");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
    });
  });

  describe("invalid passwords — missing lowercase", () => {
    it("rejects password with no lowercase letter", () => {
      const result = validatePassword("PASSWORD1");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
    });
  });

  describe("invalid passwords — missing digit", () => {
    it("rejects password with no digit", () => {
      const result = validatePassword("PasswordABC");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("digit"))).toBe(true);
    });
  });

  describe("multiple violations", () => {
    it("reports all violations for a very weak password", () => {
      const result = validatePassword("abc");
      expect(result.valid).toBe(false);
      // Too short, no uppercase, no digit
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// ─── Property-Based Tests ──────────────────────────────────────────────────────

/**
 * Property 12: Password Complexity Validation
 * Validates: Requirements 11.2
 *
 * For any password string that is accepted by the registration validator,
 * the string SHALL have length ≥ 8, contain at least one uppercase ASCII letter,
 * at least one lowercase ASCII letter, and at least one ASCII digit.
 *
 * For any password string that violates any one of those four conditions,
 * the registration validator SHALL reject it.
 */
describe("Property 12: Password Complexity Validation", () => {
  /**
   * Arbitrary that generates passwords satisfying ALL four requirements.
   * Strategy: build a password from guaranteed characters + random filler.
   */
  const validPasswordArb = fc
    .tuple(
      fc.stringMatching(/[A-Z]/),          // at least one uppercase
      fc.stringMatching(/[a-z]/),          // at least one lowercase
      fc.stringMatching(/[0-9]/),          // at least one digit
      fc.string({ minLength: 5, maxLength: 20, unit: "grapheme-ascii" }) // filler
    )
    .map(([upper, lower, digit, filler]) => {
      // Shuffle to avoid predictable patterns
      const chars = (upper + lower + digit + filler).split("");
      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join("");
    })
    .filter((p) => {
      // Ensure all four conditions are met after shuffle
      return (
        p.length >= 8 &&
        /[A-Z]/.test(p) &&
        /[a-z]/.test(p) &&
        /[0-9]/.test(p)
      );
    });

  it("accepts any password that meets all four requirements", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        const result = validatePassword(password);
        return result.valid === true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepted passwords always have length ≥ 8", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        if (validatePassword(password).valid) {
          return password.length >= 8;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepted passwords always contain at least one uppercase letter", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        if (validatePassword(password).valid) {
          return /[A-Z]/.test(password);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepted passwords always contain at least one lowercase letter", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        if (validatePassword(password).valid) {
          return /[a-z]/.test(password);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepted passwords always contain at least one digit", () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        if (validatePassword(password).valid) {
          return /[0-9]/.test(password);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("rejects any password shorter than 8 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7, unit: "grapheme-ascii" }),
        (password) => {
          const result = validatePassword(password);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any password with no uppercase letter", () => {
    // Generate passwords that are long enough and have lowercase + digit but NO uppercase
    const noUpperArb = fc
      .tuple(
        fc.stringMatching(/[a-z]/),
        fc.stringMatching(/[0-9]/),
        fc.string({ minLength: 6, maxLength: 20, unit: "grapheme-ascii" })
      )
      .map(([lower, digit, filler]) => lower + digit + filler)
      .filter((p) => p.length >= 8 && !/[A-Z]/.test(p));

    fc.assert(
      fc.property(noUpperArb, (password) => {
        return validatePassword(password).valid === false;
      }),
      { numRuns: 100 }
    );
  });

  it("rejects any password with no lowercase letter", () => {
    const noLowerArb = fc
      .tuple(
        fc.stringMatching(/[A-Z]/),
        fc.stringMatching(/[0-9]/),
        fc.string({ minLength: 6, maxLength: 20, unit: "grapheme-ascii" })
      )
      .map(([upper, digit, filler]) => upper + digit + filler)
      .filter((p) => p.length >= 8 && !/[a-z]/.test(p));

    fc.assert(
      fc.property(noLowerArb, (password) => {
        return validatePassword(password).valid === false;
      }),
      { numRuns: 100 }
    );
  });

  it("rejects any password with no digit", () => {
    const noDigitArb = fc
      .tuple(
        fc.stringMatching(/[A-Z]/),
        fc.stringMatching(/[a-z]/),
        fc.string({ minLength: 6, maxLength: 20, unit: "grapheme-ascii" })
      )
      .map(([upper, lower, filler]) => upper + lower + filler)
      .filter((p) => p.length >= 8 && !/[0-9]/.test(p));

    fc.assert(
      fc.property(noDigitArb, (password) => {
        return validatePassword(password).valid === false;
      }),
      { numRuns: 100 }
    );
  });

  it("isPasswordValid is consistent with validatePassword", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme-ascii" }), (password) => {
        return isPasswordValid(password) === validatePassword(password).valid;
      }),
      { numRuns: 200 }
    );
  });
});
