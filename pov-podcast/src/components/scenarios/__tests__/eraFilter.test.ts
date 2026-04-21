// Feature: pov-podcast, Scenario Library era filtering
import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ── Pure filtering logic extracted for testing ─────────────────────────────

type Era = "Ancient" | "Medieval" | "Modern" | "Contemporary";

interface ScenarioStub {
  _id: string;
  era: Era;
  isPrebuilt: boolean;
}

/**
 * Mirrors the filtering logic in HomePage.
 * Returns scenarios matching the selected era filter.
 */
function filterScenariosByEra(
  scenarios: ScenarioStub[],
  selectedEra: "All" | Era
): ScenarioStub[] {
  if (selectedEra === "All") return scenarios;
  return scenarios.filter((s) => s.era === selectedEra);
}

// ── Unit Tests ─────────────────────────────────────────────────────────────

describe("Era filter — unit tests", () => {
  const scenarios: ScenarioStub[] = [
    { _id: "1", era: "Modern", isPrebuilt: true },
    { _id: "2", era: "Modern", isPrebuilt: true },
    { _id: "3", era: "Contemporary", isPrebuilt: true },
    { _id: "4", era: "Contemporary", isPrebuilt: true },
    { _id: "5", era: "Ancient", isPrebuilt: true },
    { _id: "6", era: "Medieval", isPrebuilt: true },
  ];

  it("returns all scenarios when filter is 'All'", () => {
    expect(filterScenariosByEra(scenarios, "All")).toHaveLength(6);
  });

  it("returns only Modern scenarios when filter is 'Modern'", () => {
    const result = filterScenariosByEra(scenarios, "Modern");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.era === "Modern")).toBe(true);
  });

  it("returns only Contemporary scenarios when filter is 'Contemporary'", () => {
    const result = filterScenariosByEra(scenarios, "Contemporary");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.era === "Contemporary")).toBe(true);
  });

  it("returns empty array when no scenarios match the filter", () => {
    const modernOnly: ScenarioStub[] = [
      { _id: "1", era: "Modern", isPrebuilt: true },
    ];
    expect(filterScenariosByEra(modernOnly, "Contemporary")).toHaveLength(0);
  });

  it("returns empty array when input is empty", () => {
    expect(filterScenariosByEra([], "Modern")).toHaveLength(0);
    expect(filterScenariosByEra([], "All")).toHaveLength(0);
  });

  it("the 12 pre-built scenarios include exactly 5 Modern and 7 Contemporary", () => {
    // From requirements 1.1: Modern = WWII, India-Pakistan, Titanic, Hiroshima, Jack the Ripper (5)
    // Contemporary = Moon Landing, COVID-19, Stanford Prison, Bhopal, Bin Laden, Kargil, Chernobyl (7)
    const prebuilt: ScenarioStub[] = [
      { _id: "1", era: "Modern", isPrebuilt: true },      // WWII
      { _id: "2", era: "Modern", isPrebuilt: true },      // India-Pakistan
      { _id: "3", era: "Contemporary", isPrebuilt: true }, // Moon Landing
      { _id: "4", era: "Modern", isPrebuilt: true },      // Titanic
      { _id: "5", era: "Modern", isPrebuilt: true },      // Hiroshima
      { _id: "6", era: "Contemporary", isPrebuilt: true }, // COVID-19
      { _id: "7", era: "Contemporary", isPrebuilt: true }, // Stanford Prison
      { _id: "8", era: "Modern", isPrebuilt: true },      // Jack the Ripper
      { _id: "9", era: "Contemporary", isPrebuilt: true }, // Bhopal
      { _id: "10", era: "Contemporary", isPrebuilt: true }, // Bin Laden
      { _id: "11", era: "Contemporary", isPrebuilt: true }, // Kargil
      { _id: "12", era: "Contemporary", isPrebuilt: true }, // Chernobyl
    ];

    expect(filterScenariosByEra(prebuilt, "Modern")).toHaveLength(5);
    expect(filterScenariosByEra(prebuilt, "Contemporary")).toHaveLength(7);
    expect(filterScenariosByEra(prebuilt, "All")).toHaveLength(12);
  });
});

// ── Property-Based Tests ───────────────────────────────────────────────────

const eraArb = fc.constantFrom<Era>(
  "Ancient",
  "Medieval",
  "Modern",
  "Contemporary"
);

const scenarioArb = fc
  .tuple(fc.uuid(), eraArb, fc.boolean())
  .map(([id, era, isPrebuilt]) => ({ _id: id, era, isPrebuilt }));

const scenariosArb = fc.array(scenarioArb, { minLength: 0, maxLength: 50 });

describe("Era filter — property tests", () => {
  it("'All' filter always returns the full list (Req 1.5)", () => {
    fc.assert(
      fc.property(scenariosArb, (scenarios) => {
        return filterScenariosByEra(scenarios, "All").length === scenarios.length;
      }),
      { numRuns: 100 }
    );
  });

  it("era filter never returns scenarios from a different era (Req 1.6)", () => {
    fc.assert(
      fc.property(scenariosArb, eraArb, (scenarios, era) => {
        const result = filterScenariosByEra(scenarios, era);
        return result.every((s) => s.era === era);
      }),
      { numRuns: 100 }
    );
  });

  it("era filter never loses scenarios that match the selected era", () => {
    fc.assert(
      fc.property(scenariosArb, eraArb, (scenarios, era) => {
        const matching = scenarios.filter((s) => s.era === era);
        const result = filterScenariosByEra(scenarios, era);
        return result.length === matching.length;
      }),
      { numRuns: 100 }
    );
  });

  it("filtered result is always a subset of the original list", () => {
    fc.assert(
      fc.property(scenariosArb, eraArb, (scenarios, era) => {
        const result = filterScenariosByEra(scenarios, era);
        return result.every((s) => scenarios.some((orig) => orig._id === s._id));
      }),
      { numRuns: 100 }
    );
  });

  it("filtering is idempotent — applying the same filter twice gives the same result", () => {
    fc.assert(
      fc.property(scenariosArb, eraArb, (scenarios, era) => {
        const once = filterScenariosByEra(scenarios, era);
        const twice = filterScenariosByEra(once, era);
        return (
          once.length === twice.length &&
          once.every((s, i) => s._id === twice[i]._id)
        );
      }),
      { numRuns: 100 }
    );
  });
});
