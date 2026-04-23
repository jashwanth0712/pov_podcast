/**
 * Pure helper for reconstructing the full history visible from a given branch.
 *
 * This represents the "prior history is preserved" invariant (Req 16.1, 5.4):
 * all turns from the root branch up to the fork point are accessible in any
 * child branch's history, plus all turns on the child branch itself.
 */

export interface BranchRecord {
  id: string;
  parentBranchId: string | null;
  forkPointTurnIndex: number | null;
}

export interface TurnRecord {
  id: string;
  branchId: string;
  turnIndex: number;
  text: string;
}

/**
 * Builds the full history visible from a given branch.
 *
 * Algorithm:
 * 1. Walk up the branch ancestry chain from the target branch to the root.
 * 2. For each ancestor branch, include turns with turnIndex < forkPointTurnIndex
 *    (i.e. turns that existed before the fork).
 * 3. Include all turns on the target branch itself (no upper bound).
 *
 * Returns turns in chronological order (sorted by turnIndex within each segment).
 */
export function buildBranchHistory(
  branches: BranchRecord[],
  turns: TurnRecord[],
  targetBranchId: string
): TurnRecord[] {
  // Build a lookup map for branches
  const branchMap = new Map<string, BranchRecord>();
  for (const branch of branches) {
    branchMap.set(branch.id, branch);
  }

  // Build a lookup map for turns by branchId
  const turnsByBranch = new Map<string, TurnRecord[]>();
  for (const turn of turns) {
    const existing = turnsByBranch.get(turn.branchId) ?? [];
    existing.push(turn);
    turnsByBranch.set(turn.branchId, existing);
  }

  // Walk up the ancestry chain, collecting (branchId, maxTurnIndex) pairs
  // The target branch has no upper bound (null = include all turns)
  const segments: Array<{ branchId: string; maxTurnIndex: number | null }> = [];

  let currentBranchId: string | null = targetBranchId;
  let currentMaxTurnIndex: number | null = null; // no upper bound for the target branch

  while (currentBranchId !== null) {
    const branch = branchMap.get(currentBranchId);
    if (!branch) break;

    segments.push({ branchId: currentBranchId, maxTurnIndex: currentMaxTurnIndex });

    // Move to parent; the parent's turns are only visible up to the fork point
    if (branch.parentBranchId !== null && branch.forkPointTurnIndex !== null) {
      currentMaxTurnIndex = branch.forkPointTurnIndex; // exclusive upper bound
      currentBranchId = branch.parentBranchId;
    } else {
      // Root branch — stop
      break;
    }
  }

  // Collect turns for each segment, respecting the upper bound
  const result: TurnRecord[] = [];
  // Reverse so we go from root → target (chronological order)
  for (const segment of segments.reverse()) {
    const branchTurns = (turnsByBranch.get(segment.branchId) ?? [])
      .filter((t) =>
        segment.maxTurnIndex === null ? true : t.turnIndex < segment.maxTurnIndex
      )
      .sort((a, b) => a.turnIndex - b.turnIndex);
    result.push(...branchTurns);
  }

  return result;
}
