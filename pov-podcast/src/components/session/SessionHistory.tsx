"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";

/**
 * Formats a Unix timestamp (ms) as a human-readable relative or absolute date.
 * - Within the last 24 hours: "X hours ago" / "X minutes ago"
 * - Within the last 7 days: "X days ago"
 * - Otherwise: locale date string
 */
function formatLastActivity(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_BADGE: Record<
  "active" | "paused" | "completed",
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  paused: {
    label: "Paused",
    className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  },
  completed: {
    label: "Completed",
    className: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
  },
};

/**
 * SessionHistory — displays the authenticated user's past sessions ordered by
 * most recent activity. Each row shows the scenario title, last-activity date,
 * and a status badge. Clicking a row navigates to the session player, restoring
 * the session to its last saved state.
 *
 * Requirements: 7.2, 7.3
 */
export function SessionHistory() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  // Skip the query when not authenticated (Req 7.2 — only for logged-in users)
  const sessions = useQuery(
    api.sessions.getUserSessions,
    isAuthenticated ? {} : "skip"
  );

  const handleSessionClick = (sessionId: string) => {
    // Navigate to the session player — restores the session to its last saved
    // state (Req 7.3)
    router.push(`/session/${sessionId}`);
  };

  // Not authenticated — don't render anything (parent handles the sign-in prompt)
  if (!isAuthenticated) return null;

  // Loading state
  if (sessions === undefined) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Loading session history"
        aria-busy="true"
      >
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-white/5 animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm py-16 text-center px-6"
        role="status"
      >
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20"
          aria-hidden="true"
        >
          <svg
            className="h-6 w-6 text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-white">No sessions yet</h3>
        <p className="mt-1 text-xs text-white/50 max-w-xs">
          Start a scenario to begin your first session. Your history will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="space-y-2"
      role="list"
      aria-label="Past sessions"
    >
      {sessions.map((session: {
        sessionId: string;
        scenarioId: string;
        scenarioTitle: string;
        lastActivityAt: number;
        status: "active" | "paused" | "completed";
        activeBranchId: string;
      }) => {
        const badge = STATUS_BADGE[session.status];
        return (
          <li key={session.sessionId}>
            <button
              onClick={() => handleSessionClick(session.sessionId)}
              className="
                w-full flex items-center justify-between gap-4
                rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
                px-4 py-3.5
                hover:bg-white/10 hover:border-white/20
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                transition-all duration-200 text-left
              "
              aria-label={`Resume session: ${session.scenarioTitle}, last active ${formatLastActivity(session.lastActivityAt)}, status ${session.status}`}
            >
              {/* Left: scenario title + last activity */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {session.scenarioTitle}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {formatLastActivity(session.lastActivityAt)}
                </p>
              </div>

              {/* Right: status badge + chevron */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                  aria-label={`Status: ${badge.label}`}
                >
                  {badge.label}
                </span>
                <svg
                  className="h-4 w-4 text-white/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
