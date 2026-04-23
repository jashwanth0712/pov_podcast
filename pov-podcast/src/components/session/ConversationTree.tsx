"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConversationTreeProps {
  sessionId: Id<"sessions">;
}

// ─── ConversationTree ─────────────────────────────────────────────────────────

/**
 * ConversationTree — visual conversation tree showing all branches, fork points,
 * and the currently active branch.
 *
 * Requirements: 4.10, 16.3, 16.5
 */
export function ConversationTree({ sessionId }: ConversationTreeProps) {
  const treeData = useQuery(api.sessions.getConversationTree, { sessionId });
  const navigateToBranch = useMutation(api.sessions.navigateToBranch);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (treeData === undefined) {
    return (
      <div
        className="flex items-center justify-center py-8"
        role="status"
        aria-label="Loading conversation tree"
      >
        <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (treeData === null) {
    return (
      <div className="py-4 text-center text-sm text-white/40">
        Conversation tree unavailable.
      </div>
    );
  }

  const { branches, activeBranchId } = treeData;

  if (branches.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-white/40">
        No branches yet.
      </div>
    );
  }

  const handleNavigate = async (branchId: Id<"branches">) => {
    try {
      await navigateToBranch({ sessionId, branchId });
    } catch {
      // Navigation errors are non-fatal; the UI will reflect the current state
    }
  };

  return (
    <nav
      aria-label="Conversation branches"
      className="space-y-2"
    >
      {branches.map((branch, index) => {
        const isActive = branch._id === activeBranchId;
        const isRoot = branch.parentBranchId === undefined || branch.parentBranchId === null;
        const branchNumber = index + 1;

        return (
          <div
            key={branch._id}
            className={`
              relative flex items-center gap-3 rounded-xl border p-3 transition-all duration-200
              ${
                isActive
                  ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
              }
            `}
            aria-current={isActive ? "true" : undefined}
          >
            {/* Branch icon / connector */}
            <div className="flex-shrink-0">
              {isRoot ? (
                <div
                  className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive ? "bg-purple-500/30 text-purple-300" : "bg-white/5 text-white/40"}
                  `}
                  aria-hidden="true"
                >
                  ●
                </div>
              ) : (
                <div
                  className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive ? "bg-purple-500/30 text-purple-300" : "bg-white/5 text-white/40"}
                  `}
                  aria-hidden="true"
                >
                  ⑂
                </div>
              )}
            </div>

            {/* Branch info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-semibold ${isActive ? "text-purple-300" : "text-white/70"}`}
                >
                  {isRoot ? "Main Branch" : `Branch ${branchNumber}`}
                </span>

                {isActive && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/30"
                    aria-label="Currently active branch"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" aria-hidden="true" />
                    Active
                  </span>
                )}
              </div>

              {!isRoot && branch.forkPointTurnIndex !== undefined && branch.forkPointTurnIndex !== null && (
                <p className="text-xs text-white/40 mt-0.5">
                  Forked at turn {branch.forkPointTurnIndex}
                </p>
              )}
            </div>

            {/* Navigate button */}
            {!isActive && (
              <button
                onClick={() => handleNavigate(branch._id)}
                className="
                  flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5
                  text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white/80
                  hover:border-white/20 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-purple-500/50 transition-all duration-150
                "
                aria-label={`Navigate to ${isRoot ? "main branch" : `branch ${branchNumber}`}`}
              >
                Navigate
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
