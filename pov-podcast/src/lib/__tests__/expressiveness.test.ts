// Feature: pov-podcast, Property 14: Expressiveness Validation Accepts Turns with Required Elements
// Validates: Requirements 15.2

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateExpressiveness } from "../../../convex/lib/expressiveness";

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("validateExpressiveness — unit tests", () => {
  describe("emotional statements", () => {
    it("accepts text containing 'feel'", () => {
      expect(validateExpressiveness("I feel deeply troubled by what has happened here.")).toBe(true);
    });

    it("accepts text containing 'fear'", () => {
      expect(validateExpressiveness("My fear is that we will never recover from this.")).toBe(true);
    });

    it("accepts text containing 'grief'", () => {
      expect(validateExpressiveness("The grief I carry is immeasurable.")).toBe(true);
    });

    it("accepts text containing 'devastated'", () => {
      expect(validateExpressiveness("I am devastated by the loss of so many lives.")).toBe(true);
    });

    it("accepts text containing 'proud'", () => {
      expect(validateExpressiveness("I am proud of what we have accomplished together.")).toBe(true);
    });

    it("accepts text containing 'hope'", () => {
      expect(validateExpressiveness("There is still hope for a better future.")).toBe(true);
    });
  });

  describe("personal struggle references", () => {
    it("accepts text with first-person + struggle word", () => {
      expect(
        validateExpressiveness("I struggled through the darkest days of the occupation.")
      ).toBe(true);
    });

    it("accepts text with 'I witnessed'", () => {
      expect(
        validateExpressiveness("I witnessed the destruction of everything I had built.")
      ).toBe(true);
    });

    it("accepts text with 'I survived'", () => {
      expect(
        validateExpressiveness("I survived when so many others did not, and that haunts me.")
      ).toBe(true);
    });

    it("accepts text with 'my' + struggle word", () => {
      expect(
        validateExpressiveness("My family suffered greatly during those years.")
      ).toBe(true);
    });

    it("does NOT accept struggle word without first-person pronoun", () => {
      // "suffered" alone without I/my/me/myself should not trigger personal struggle
      const text = "The population suffered greatly during those years.";
      // This might still pass via emotional keywords — test the specific path
      // by using a text with only struggle words and no emotional/ideological keywords
      const pureStruggleNoFirstPerson = "suffered endured witnessed survived";
      expect(validateExpressiveness(pureStruggleNoFirstPerson)).toBe(false);
    });
  });

  describe("ideological assertions", () => {
    it("accepts text containing 'believe'", () => {
      expect(
        validateExpressiveness("I believe that justice must prevail above all else.")
      ).toBe(true);
    });

    it("accepts text containing 'freedom'", () => {
      expect(
        validateExpressiveness("Freedom is not given — it must be fought for and defended.")
      ).toBe(true);
    });

    it("accepts text containing 'duty'", () => {
      expect(
        validateExpressiveness("It is our duty to protect those who cannot protect themselves.")
      ).toBe(true);
    });

    it("accepts text containing 'justice'", () => {
      expect(
        validateExpressiveness("Justice demands that we hold the powerful accountable.")
      ).toBe(true);
    });

    it("accepts text containing 'moral'", () => {
      expect(
        validateExpressiveness("The moral weight of this decision cannot be understated.")
      ).toBe(true);
    });

    it("accepts text containing 'must'", () => {
      expect(
        validateExpressiveness("We must act now before it is too late.")
      ).toBe(true);
    });
  });

  describe("rejection cases", () => {
    it("rejects empty string", () => {
      expect(validateExpressiveness("")).toBe(false);
    });

    it("rejects whitespace-only string", () => {
      expect(validateExpressiveness("   \n\t  ")).toBe(false);
    });

    it("rejects purely factual neutral text", () => {
      expect(
        validateExpressiveness(
          "The battle took place on the eastern front in 1943."
        )
      ).toBe(false);
    });

    it("rejects a date-only statement", () => {
      expect(validateExpressiveness("1945-05-08")).toBe(false);
    });

    it("rejects a purely descriptive sentence with no emotional/ideological content", () => {
      expect(
        validateExpressiveness("The soldiers marched north along the river bank.")
      ).toBe(false);
    });
  });

  describe("case insensitivity", () => {
    it("accepts uppercase emotional keywords", () => {
      expect(validateExpressiveness("I FEEL deeply troubled.")).toBe(true);
    });

    it("accepts mixed-case ideological keywords", () => {
      expect(validateExpressiveness("We MUST stand together.")).toBe(true);
    });
  });
});

// ─── Property 14: Expressiveness Validation Accepts Turns with Required Elements ──
// Validates: Requirements 15.2

describe("Property 14: Expressiveness Validation Accepts Turns with Required Elements", () => {
  // Arbitraries for generating expressive text

  const emotionalKeywords = [
    "feel", "felt", "emotion", "heart", "fear", "hope", "anger", "grief",
    "joy", "pain", "love", "hate", "afraid", "proud", "ashamed", "desperate",
    "horrified", "moved", "touched", "devastated",
  ];

  const ideologicalKeywords = [
    "believe", "must", "should", "right", "wrong", "justice", "freedom",
    "duty", "principle", "truth", "moral", "values", "ideology",
  ];

  const firstPersonWords = ["I", "my", "me", "myself"];
  const struggleWords = [
    "struggle", "suffer", "lost", "watched", "witnessed", "survived",
    "endured", "faced",
  ];

  /** Generates text that contains an emotional keyword */
  const textWithEmotionalKeyword = fc
    .tuple(
      fc.constantFrom(...emotionalKeywords),
      fc.string({ minLength: 5, maxLength: 50 }),
      fc.string({ minLength: 5, maxLength: 50 })
    )
    .map(([kw, prefix, suffix]) => `${prefix} ${kw} ${suffix}`);

  /** Generates text that contains an ideological keyword */
  const textWithIdeologicalKeyword = fc
    .tuple(
      fc.constantFrom(...ideologicalKeywords),
      fc.string({ minLength: 5, maxLength: 50 }),
      fc.string({ minLength: 5, maxLength: 50 })
    )
    .map(([kw, prefix, suffix]) => `${prefix} ${kw} ${suffix}`);

  /** Generates text with a first-person pronoun + struggle word */
  const textWithPersonalStruggle = fc
    .tuple(
      fc.constantFrom(...firstPersonWords),
      fc.constantFrom(...struggleWords),
      fc.string({ minLength: 3, maxLength: 40 })
    )
    .map(([fp, sw, suffix]) => `${fp} ${sw} ${suffix}`);

  it("accepts any text containing an emotional keyword (Req 15.2)", () => {
    fc.assert(
      fc.property(textWithEmotionalKeyword, (text) => {
        return validateExpressiveness(text) === true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepts any text containing an ideological keyword (Req 15.2)", () => {
    fc.assert(
      fc.property(textWithIdeologicalKeyword, (text) => {
        return validateExpressiveness(text) === true;
      }),
      { numRuns: 100 }
    );
  });

  it("accepts any text with a first-person pronoun and a struggle word (Req 15.2)", () => {
    fc.assert(
      fc.property(textWithPersonalStruggle, (text) => {
        return validateExpressiveness(text) === true;
      }),
      { numRuns: 100 }
    );
  });

  it("rejects empty and whitespace-only strings (Req 15.2)", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          // Generate strings composed only of whitespace characters
          fc.array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 20 })
            .map((chars) => chars.join(""))
        ),
        (text) => {
          return validateExpressiveness(text) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("result is deterministic — same input always produces same output (Req 15.2)", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (text) => {
        const result1 = validateExpressiveness(text);
        const result2 = validateExpressiveness(text);
        return result1 === result2;
      }),
      { numRuns: 200 }
    );
  });

  it("validation is case-insensitive — uppercase keywords are accepted (Req 15.2)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...emotionalKeywords),
        fc.string({ minLength: 3, maxLength: 30 }),
        (kw, context) => {
          const lowerText = `${context} ${kw.toLowerCase()} ${context}`;
          const upperText = `${context} ${kw.toUpperCase()} ${context}`;
          // Both should produce the same result
          return validateExpressiveness(lowerText) === validateExpressiveness(upperText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("text with any expressive element is always accepted (Req 15.2)", () => {
    // Generate text that definitely has at least one expressive element
    const expressiveText = fc.oneof(
      textWithEmotionalKeyword,
      textWithIdeologicalKeyword,
      textWithPersonalStruggle
    );

    fc.assert(
      fc.property(expressiveText, (text) => {
        return validateExpressiveness(text) === true;
      }),
      { numRuns: 200 }
    );
  });
});
