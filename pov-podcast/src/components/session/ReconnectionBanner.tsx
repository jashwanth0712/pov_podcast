"use client";

import type { ConnectionStatus } from "../../hooks/useConnectionStatus";

interface ReconnectionBannerProps {
  status: ConnectionStatus;
  secondsElapsed: number;
}

/**
 * ReconnectionBanner — displays a status banner when the Convex WebSocket
 * connection is lost or has permanently failed.
 *
 * - Hidden when `status === "connected"`.
 * - Amber/yellow banner when `status === "reconnecting"`:
 *   "Connection lost. Reconnecting… (Xs)"
 * - Red error banner when `status === "failed"`:
 *   "Connection failed. Your transcript has been preserved."
 *
 * Accessible: role="alert", aria-live="polite".
 *
 * Requirements: 10.3, 10.4
 */
export function ReconnectionBanner({
  status,
  secondsElapsed,
}: ReconnectionBannerProps) {
  if (status === "connected") return null;

  const isReconnecting = status === "reconnecting";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
        ${
          isReconnecting
            ? "bg-amber-500/20 border-b border-amber-500/30 text-amber-300"
            : "bg-red-500/20 border-b border-red-500/30 text-red-300"
        }
      `}
    >
      {isReconnecting ? (
        <>
          {/* Spinner */}
          <svg
            className="h-4 w-4 animate-spin flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            Connection lost. Reconnecting&hellip;{" "}
            <span aria-label={`${secondsElapsed} seconds elapsed`}>
              ({secondsElapsed}s)
            </span>
          </span>
        </>
      ) : (
        <>
          {/* Warning icon */}
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <span>
            Connection failed. Your transcript has been preserved.
          </span>
        </>
      )}
    </div>
  );
}
