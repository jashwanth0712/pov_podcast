// Feature: pov-podcast, Property 4: Branch Fork Preserves Prior History
// Validates: Requirements 16.1, 5.4

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildBranchHistory,
  type BranchRecord,
  type TurnRecord,
} from "./branchFork";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/**
 * Generates a simple two-level tree: one root branch + one child branch.
 *
 * - Root branch has N turns (turnIndex 0..N-1)
 * - Child branch forks at forkPoint (0 < forkPoint <= N) and has M additional turns
 *   (turnIndex 0..M-1 on the child branch)
 */
const twoLevelTreeArb = fc
  .tuple(
    fc.integer({ min: 1, max: 10 }), // N: number of root turns
    fc.integer({ min: 0, max: 10 })  // M: number of child turns
  )
  .chain(([n, m]) =>
    fc
      .integer({ min: 0, max: n }) // forkPoint: 0..N (fork after turn forkPoint-1)
      .map((forkPoint) => {
        const rootBranch: BranchRecord = {
          id: "root",
          parentBranchId: null,
          forkPointTurnIndex: null,
        };
        const childBranch: BranchRecord = {
          id: "child",
          parentBranchId: "root",
          forkPointTurnIndex: forkPoint,
        };

        const rootTurns: TurnRecord[] = Array.from({ length: n }, (_, i) => ({
          id: `root-turn-${i}`,
          branchId: "root",
          turnIndex: i,
          text: `Root turn ${i}`,
        }));

        const childTurns: TurnRecord[] = Array.from({ length: m }, (_, i) => ({
          id: `child-turn-${i}`,
          branchId: "child",
          turnIndex: i,
          text: `Child turn ${i}`,
        }));

        return { rootBranch, childBranch, rootTurns, childTurns, n, m, forkPoint };
      })
  );

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe("buildBranchHistory — unit tests", () => {
  it("root branch returns all its own turns", () => {
    const branches: BranchRecord[] = [
      { id: "root", parentBranchId: null, forkPointTurnIndex: null },
    ];
    const turns: TurnRecord[] = [
      { id: "t0", branchId: "root", turnIndex: 0, text: "Turn 0" },
      { id: "t1", branchId: "root", turnIndex: 1, text: "Turn 1" },
      { id: "t2", branchId: "root", turnIndex: 2, text: "Turn 2" },
    ];

    const history = buildBranchHistory(branches, turns, "root");
    expect(history).toHaveLength(3);
    expect(history.map((t) => t.turnIndex)).toEqual([0, 1, 2]);
  });

  it("child branch includes parent turns up to fork point", () => {
    const branches: BranchRecord[] = [
      { id: "root", parentBranchId: null, forkPointTurnIndex: null },
      { id: "child", parentBranchId: "root", forkPointTurnIndex: 2 },
    ];
    const turns: TurnRecord[] = [
      { id: "r0", branchId: "root", turnIndex: 0, text: "Root 0" },
      { id: "r1", branchId: "root", turnIndex: 1, text: "Root 1" },
      { id: "r2", branchId: "root", turnIndex: 2, text: "Root 2" }, // after fork
      { id: "c0", branchId: "child", turnIndex: 0, text: "Child 0" },
      { id: "c1", branchId: "child", turnIndex: 1, text: "Child 1" },
    ];

    const history = buildBranchHistory(branches, turns, "child");
    // Should include root turns 0 and 1 (< forkPoint 2), plus child turns 0 and 1
    expect(history).toHaveLength(4);
    expect(history[0].id).toBe("r0");
    expect(history[1].id).toBe("r1");
    expect(history[2].id).toBe("c0");
    expect(history[3].id).toBe("c1");
  });

  it("parent branch does NOT include child turns", () => {
    const branches: BranchRecord[] = [
      { id: "root", parentBranchId: null, forkPointTurnIndex: null },
      { id: "child", parentBranchId: "root", forkPointTurnIndex: 1 },
    ];
    const turns: TurnRecord[] = [
      { id: "r0", branchId: "root", turnIndex: 0, text: "Root 0" },
      { id: "c0", branchId: "child", turnIndex: 0, text: "Child 0" },
    ];

    const rootHistory = buildBranchHistory(branches, turns, "root");
    expect(rootHistory).toHaveLength(1);
    expect(rootHistory[0].id).toBe("r0");
  });

  it("fork at index 0 means no parent turns are included", () => {
    const branches: BranchRecord[] = [
      { id: "root", parentBranchId: null, forkPointTurnIndex: null },
      { id: "child", parentBranchId: "root", forkPointTurnIndex: 0 },
    ];
    const turns: TurnRecord[] = [
      { id: "r0", branchId: "root", turnIndex: 0, text: "Root 0" },
      { id: "c0", branchId: "child", turnIndex: 0, text: "Child 0" },
    ];

    const history = buildBranchHistory(branches, turns, "child");
    // forkPoint = 0 means no root turns (turnIndex < 0 is empty)
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("c0");
  });

  it("empty branches and turns returns empty history", () => {
    const history = buildBranchHistory([], [], "nonexistent");
    expect(history).toHaveLength(0);
  });
});

// ─── Property 4: Branch Fork Preserves Prior History ─────────────────────────
// Feature: pov-podcast, Property 4: Branch Fork Preserves Prior History
// Validates: Requirements 16.1, 5.4

describe("Property 4: Branch Fork Preserves Prior History", () => {
  // Property 4a: For any branch created from a fork point N, all turns with
  // turnIndex < N from the parent branch are accessible in the child branch's history.
  it("4a: all parent turns before the fork point appear in child branch history (Req 16.1)", () => {
    fc.assert(
      fc.property(twoLevelTreeArb, ({ rootBranch, childBranch, rootTurns, childTurns, forkPoint }) => {
        const branches = [rootBranch, childBranch];
        const turns = [...rootTurns, ...childTurns];

        const childHistory = buildBranchHistory(branches, turns, "child");
        const childHistoryIds = new Set(childHistory.map((t) => t.id));

        // Every root turn with turnIndex < forkPoint must appear in child history
        const expectedRootTurns = rootTurns.filter((t) => t.turnIndex < forkPoint);
        return expectedRootTurns.every((t) => childHistoryIds.has(t.id));
      }),
      { numRuns: 100 }
    );
  });

  // Property 4b: The child branch's own turns (after the fork point) do NOT
  // appear in the parent branch's history.
  it("4b: child branch turns do not appear in parent branch history (Req 5.4)", () => {
    fc.assert(
      fc.property(twoLevelTreeArb, ({ rootBranch, childBranch, rootTurns, childTurns }) => {
        const branches = [rootBranch, childBranch];
        const turns = [...rootTurns, ...childTurns];

        const rootHistory = buildBranchHistory(branches, turns, "root");
        const rootHistoryIds = new Set(rootHistory.map((t) => t.id));

        // No child turn should appear in root history
        return childTurns.every((t) => !rootHistoryIds.has(t.id));
      }),
      { numRuns: 100 }
    );
  });

  // Property 4c: The root branch always has its full history accessible.
  it("4c: root branch always has its full history accessible (Req 16.1)", () => {
    fc.assert(
      fc.property(twoLevelTreeArb, ({ rootBranch, childBranch, rootTurns, childTurns }) => {
        const branches = [rootBranch, childBranch];
        const turns = [...rootTurns, ...childTurns];

        const rootHistory = buildBranchHistory(branches, turns, "root");
        const rootHistoryIds = new Set(rootHistory.map((t) => t.id));

        // Every root turn must appear in root history
        return rootTurns.every((t) => rootHistoryIds.has(t.id));
      }),
      { numRuns: 100 }
    );
  });

  // Additional: parent turns at or after the fork point do NOT appear in child history
  it("parent turns at or after the fork point do not appear in child history (Req 16.1)", () => {
    fc.assert(
      fc.property(twoLevelTreeArb, ({ rootBranch, childBranch, rootTurns, childTurns, forkPoint }) => {
        const branches = [rootBranch, childBranch];
        const turns = [...rootTurns, ...childTurns];

        const childHistory = buildBranchHistory(branches, turns, "child");
        const childHistoryIds = new Set(childHistory.map((t) => t.id));

        // Root turns at or after forkPoint must NOT appear in child history
        const excludedRootTurns = rootTurns.filter((t) => t.turnIndex >= forkPoint);
        return excludedRootTurns.every((t) => !childHistoryIds.has(t.id));
      }),
      { numRuns: 100 }
    );
  });

  // Additional: child history is always in chronological order
  it("child branch history is always in chronological order (Req 16.1)", () => {
    fc.assert(
      fc.property(twoLevelTreeArb, ({ rootBranch, childBranch, rootTurns, childTurns }) => {
        const branches = [rootBranch, childBranch];
        const turns = [...rootTurns, ...childTurns];

        const childHistory = buildBranchHistory(branches, turns, "child");

        // History should be non-decreasing in turnIndex within each branch segment
        // (root turns come first, then child turns)
        if (childHistory.length <= 1) return true;

        // Find the boundary between root and child turns
        let prevTurnIndex = -1;
        let prevBranchId = "";
        for (const turn of childHistory) {
          if (turn.branchId === prevBranchId) {
            // Within same branch, must be strictly increasing
            if (turn.turnIndex <= prevTurnIndex) return false;
          }
          prevTurnIndex = turn.turnIndex;
          prevBranchId = turn.branchId;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
