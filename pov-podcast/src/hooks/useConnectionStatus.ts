"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexConnectionState } from "convex/react";

/** How long to wait before giving up on reconnection (ms). */
const RECONNECT_TIMEOUT_MS = 60_000;

/** How often to update the elapsed-seconds counter (ms). */
const TICK_INTERVAL_MS = 1_000;

export type ConnectionStatus = "connected" | "reconnecting" | "failed";

export interface ConnectionStatusResult {
  /** Current connection status. */
  status: ConnectionStatus;
  /**
   * Seconds elapsed since the connection was first lost.
   * 0 when status is "connected".
   */
  secondsElapsed: number;
}

/**
 * useConnectionStatus — tracks the Convex WebSocket connection state and
 * surfaces a simplified status for the UI.
 *
 * - "connected"    — WebSocket is open and healthy.
 * - "reconnecting" — WebSocket is disconnected; Convex is retrying automatically.
 *                    `secondsElapsed` counts up from 0.
 * - "failed"       — 60 seconds have passed without a successful reconnection.
 *
 * Requirements: 10.3, 10.4
 */
export function useConnectionStatus(): ConnectionStatusResult {
  const { isWebSocketConnected } = useConvexConnectionState();

  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Timestamp when the connection was first lost in the current outage.
  const disconnectedAtRef = useRef<number | null>(null);
  // Interval handle for the seconds counter.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Timeout handle for the 60-second failure threshold.
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isWebSocketConnected) {
      // ── Connection restored ──────────────────────────────────────────────
      disconnectedAtRef.current = null;

      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (failTimeoutRef.current !== null) {
        clearTimeout(failTimeoutRef.current);
        failTimeoutRef.current = null;
      }

      setStatus("connected");
      setSecondsElapsed(0);
    } else {
      // ── Connection lost ──────────────────────────────────────────────────
      // Only start the timers if we haven't already (avoid restarting on
      // every render while still disconnected).
      if (disconnectedAtRef.current === null) {
        disconnectedAtRef.current = Date.now();

        setStatus("reconnecting");
        setSecondsElapsed(0);

        // Tick every second to update the elapsed counter.
        tickRef.current = setInterval(() => {
          const elapsed = Math.floor(
            (Date.now() - (disconnectedAtRef.current ?? Date.now())) / 1_000
          );
          setSecondsElapsed(elapsed);
        }, TICK_INTERVAL_MS);

        // After 60 seconds, transition to "failed".
        failTimeoutRef.current = setTimeout(() => {
          if (tickRef.current !== null) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          setStatus("failed");
        }, RECONNECT_TIMEOUT_MS);
      }
    }

    return () => {
      // Cleanup on unmount only — we intentionally keep timers running across
      // re-renders while disconnected.
    };
  }, [isWebSocketConnected]);

  // Cleanup all timers on unmount.
  useEffect(() => {
    return () => {
      if (tickRef.current !== null) clearInterval(tickRef.current);
      if (failTimeoutRef.current !== null) clearTimeout(failTimeoutRef.current);
    };
  }, []);

  return { status, secondsElapsed };
}
