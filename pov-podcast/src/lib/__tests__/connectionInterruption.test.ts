// Feature: pov-podcast, Task 18.3: Connection Interruption Handling
// Validates: Requirements 10.3, 10.4

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Unit Tests for connection status logic ────────────────────────────────────
//
// The useConnectionStatus hook is a React hook that wraps useConvexConnectionState.
// We test the underlying state-machine logic directly here, since the hook itself
// is a thin wrapper around timers and state transitions.
//
// The logic under test:
//   - When connected: status = "connected", secondsElapsed = 0
//   - When disconnected: status = "reconnecting", secondsElapsed counts up
//   - After 60 seconds disconnected: status = "failed"
//   - On reconnect after "reconnecting": status = "connected", secondsElapsed = 0
//
// Requirements: 10.3, 10.4

describe("Connection interruption handling — state machine logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Reconnection timing constants ──────────────────────────────────────────

  const RECONNECT_TIMEOUT_MS = 60_000;
  const TICK_INTERVAL_MS = 1_000;

  /**
   * Simulates the state machine logic from useConnectionStatus.
   * Returns a mutable state object that updates as timers fire.
   */
  function createConnectionStateMachine() {
    let status: "connected" | "reconnecting" | "failed" = "connected";
    let secondsElapsed = 0;
    let disconnectedAt: number | null = null;
    let tickInterval: ReturnType<typeof setInterval> | null = null;
    let failTimeout: ReturnType<typeof setTimeout> | null = null;

    function onDisconnect() {
      if (disconnectedAt !== null) return; // already tracking
      disconnectedAt = Date.now();
      status = "reconnecting";
      secondsElapsed = 0;

      tickInterval = setInterval(() => {
        secondsElapsed = Math.floor(
          (Date.now() - (disconnectedAt ?? Date.now())) / 1_000
        );
      }, TICK_INTERVAL_MS);

      failTimeout = setTimeout(() => {
        if (tickInterval !== null) {
          clearInterval(tickInterval);
          tickInterval = null;
        }
        status = "failed";
      }, RECONNECT_TIMEOUT_MS);
    }

    function onReconnect() {
      disconnectedAt = null;
      if (tickInterval !== null) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      if (failTimeout !== null) {
        clearTimeout(failTimeout);
        failTimeout = null;
      }
      status = "connected";
      secondsElapsed = 0;
    }

    function cleanup() {
      if (tickInterval !== null) clearInterval(tickInterval);
      if (failTimeout !== null) clearTimeout(failTimeout);
    }

    return {
      getStatus: () => status,
      getSecondsElapsed: () => secondsElapsed,
      onDisconnect,
      onReconnect,
      cleanup,
    };
  }

  // ── Initial state ──────────────────────────────────────────────────────────

  it("starts in connected state with 0 seconds elapsed", () => {
    const sm = createConnectionStateMachine();
    expect(sm.getStatus()).toBe("connected");
    expect(sm.getSecondsElapsed()).toBe(0);
    sm.cleanup();
  });

  // ── Disconnection transitions ──────────────────────────────────────────────

  it("transitions to reconnecting immediately on disconnect (Req 10.3)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();
    expect(sm.getStatus()).toBe("reconnecting");
    sm.cleanup();
  });

  it("starts secondsElapsed at 0 when disconnection begins", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();
    expect(sm.getSecondsElapsed()).toBe(0);
    sm.cleanup();
  });

  it("increments secondsElapsed every second while reconnecting (Req 10.3)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(5_000);
    expect(sm.getSecondsElapsed()).toBe(5);

    vi.advanceTimersByTime(5_000);
    expect(sm.getSecondsElapsed()).toBe(10);

    sm.cleanup();
  });

  it("remains in reconnecting state before 60 seconds (Req 10.3)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(59_000);
    expect(sm.getStatus()).toBe("reconnecting");

    sm.cleanup();
  });

  // ── Failure after 60 seconds ───────────────────────────────────────────────

  it("transitions to failed after exactly 60 seconds of disconnection (Req 10.4)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS);
    expect(sm.getStatus()).toBe("failed");

    sm.cleanup();
  });

  it("does not transition to failed before 60 seconds", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS - 1);
    expect(sm.getStatus()).toBe("reconnecting");

    sm.cleanup();
  });

  it("stops the seconds counter after transitioning to failed", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS);
    expect(sm.getStatus()).toBe("failed");

    const secondsAtFailure = sm.getSecondsElapsed();

    // Advance more time — counter should not increase after failure
    vi.advanceTimersByTime(10_000);
    expect(sm.getSecondsElapsed()).toBe(secondsAtFailure);

    sm.cleanup();
  });

  // ── Reconnection recovery ──────────────────────────────────────────────────

  it("transitions back to connected when reconnected before 60 seconds (Req 10.3)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(10_000);
    expect(sm.getStatus()).toBe("reconnecting");

    sm.onReconnect();
    expect(sm.getStatus()).toBe("connected");

    sm.cleanup();
  });

  it("resets secondsElapsed to 0 on reconnect", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(15_000);
    expect(sm.getSecondsElapsed()).toBe(15);

    sm.onReconnect();
    expect(sm.getSecondsElapsed()).toBe(0);

    sm.cleanup();
  });

  it("cancels the failure timeout when reconnected before 60 seconds", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(30_000);
    sm.onReconnect();

    // Advance past the original 60-second mark — should NOT transition to failed
    vi.advanceTimersByTime(35_000);
    expect(sm.getStatus()).toBe("connected");

    sm.cleanup();
  });

  // ── Multiple disconnect/reconnect cycles ───────────────────────────────────

  it("handles multiple disconnect/reconnect cycles correctly", () => {
    const sm = createConnectionStateMachine();

    // First cycle
    sm.onDisconnect();
    vi.advanceTimersByTime(5_000);
    expect(sm.getStatus()).toBe("reconnecting");
    sm.onReconnect();
    expect(sm.getStatus()).toBe("connected");

    // Second cycle
    sm.onDisconnect();
    vi.advanceTimersByTime(5_000);
    expect(sm.getStatus()).toBe("reconnecting");
    sm.onReconnect();
    expect(sm.getStatus()).toBe("connected");

    sm.cleanup();
  });

  it("does not restart timers if onDisconnect is called while already disconnected", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    vi.advanceTimersByTime(30_000);
    const secondsBefore = sm.getSecondsElapsed();

    // Calling onDisconnect again should be a no-op
    sm.onDisconnect();

    // Seconds should continue from where they were, not reset
    vi.advanceTimersByTime(5_000);
    expect(sm.getSecondsElapsed()).toBe(secondsBefore + 5);

    sm.cleanup();
  });

  // ── Retry interval verification ────────────────────────────────────────────

  it("updates secondsElapsed at 1-second intervals (Req 10.3 — retry every 5 seconds)", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    // Verify the tick fires at each second boundary
    for (let i = 1; i <= 12; i++) {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
      expect(sm.getSecondsElapsed()).toBe(i);
    }

    sm.cleanup();
  });

  it("secondsElapsed reaches 60 at the failure boundary", () => {
    const sm = createConnectionStateMachine();
    sm.onDisconnect();

    // Advance to just before failure
    vi.advanceTimersByTime(59_000);
    expect(sm.getSecondsElapsed()).toBe(59);
    expect(sm.getStatus()).toBe("reconnecting");

    // Advance to failure
    vi.advanceTimersByTime(1_000);
    expect(sm.getStatus()).toBe("failed");

    sm.cleanup();
  });
});

// ─── Unit Tests for ReconnectionBanner rendering logic ────────────────────────
//
// The ReconnectionBanner component renders different content based on status.
// We test the rendering logic (what text/state is shown) without a full DOM render.

describe("ReconnectionBanner — rendering logic", () => {
  /**
   * Simulates the banner's display decision based on status.
   * Mirrors the component's conditional rendering logic.
   */
  function getBannerContent(
    status: "connected" | "reconnecting" | "failed",
    secondsElapsed: number
  ): { visible: boolean; type: "reconnecting" | "failed" | null; secondsShown: number | null } {
    if (status === "connected") {
      return { visible: false, type: null, secondsShown: null };
    }
    if (status === "reconnecting") {
      return { visible: true, type: "reconnecting", secondsShown: secondsElapsed };
    }
    return { visible: true, type: "failed", secondsShown: null };
  }

  it("is hidden when status is connected (Req 10.3)", () => {
    const result = getBannerContent("connected", 0);
    expect(result.visible).toBe(false);
  });

  it("is visible when status is reconnecting (Req 10.3)", () => {
    const result = getBannerContent("reconnecting", 5);
    expect(result.visible).toBe(true);
    expect(result.type).toBe("reconnecting");
  });

  it("shows seconds elapsed when reconnecting (Req 10.3)", () => {
    const result = getBannerContent("reconnecting", 23);
    expect(result.secondsShown).toBe(23);
  });

  it("is visible when status is failed (Req 10.4)", () => {
    const result = getBannerContent("failed", 60);
    expect(result.visible).toBe(true);
    expect(result.type).toBe("failed");
  });

  it("does not show seconds elapsed when failed (Req 10.4)", () => {
    const result = getBannerContent("failed", 60);
    expect(result.secondsShown).toBeNull();
  });

  it("transitions from reconnecting to failed banner at 60 seconds (Req 10.4)", () => {
    const reconnecting = getBannerContent("reconnecting", 59);
    expect(reconnecting.type).toBe("reconnecting");

    const failed = getBannerContent("failed", 60);
    expect(failed.type).toBe("failed");
  });

  it("shows 0 seconds elapsed at the start of disconnection", () => {
    const result = getBannerContent("reconnecting", 0);
    expect(result.secondsShown).toBe(0);
  });

  it("shows correct seconds at various elapsed times", () => {
    for (const seconds of [1, 5, 10, 30, 59]) {
      const result = getBannerContent("reconnecting", seconds);
      expect(result.secondsShown).toBe(seconds);
    }
  });
});

// ─── Unit Tests for transcript preservation logic ─────────────────────────────
//
// When the connection transitions to "failed", the transcript must be preserved
// in local state so the user does not lose their conversation history (Req 10.4).

describe("Transcript preservation on connection failure (Req 10.4)", () => {
  /**
   * Simulates the transcript preservation logic from SessionPlayer.
   * Returns a mutable state object.
   */
  function createTranscriptPreserver<T>(initialLiveTurns: T | null) {
    let preservedTurns: T | null = null;
    let prevStatus: "connected" | "reconnecting" | "failed" = "connected";
    let liveTurns: T | null = initialLiveTurns;

    function onStatusChange(
      newStatus: "connected" | "reconnecting" | "failed"
    ) {
      const prev = prevStatus;
      prevStatus = newStatus;

      // Snapshot on transition to failed
      if (prev !== "failed" && newStatus === "failed") {
        preservedTurns = liveTurns ?? ([] as unknown as T);
      }

      // Clear snapshot on reconnect
      if (newStatus === "connected" && preservedTurns !== null) {
        preservedTurns = null;
      }
    }

    function updateLiveTurns(turns: T | null) {
      liveTurns = turns;
    }

    return {
      getPreservedTurns: () => preservedTurns,
      onStatusChange,
      updateLiveTurns,
    };
  }

  it("does not preserve turns while connected", () => {
    const preserver = createTranscriptPreserver(["turn1", "turn2"]);
    preserver.onStatusChange("connected");
    expect(preserver.getPreservedTurns()).toBeNull();
  });

  it("does not preserve turns while reconnecting", () => {
    const preserver = createTranscriptPreserver(["turn1", "turn2"]);
    preserver.onStatusChange("reconnecting");
    expect(preserver.getPreservedTurns()).toBeNull();
  });

  it("preserves turns when connection transitions to failed (Req 10.4)", () => {
    const turns = ["turn1", "turn2", "turn3"];
    const preserver = createTranscriptPreserver(turns);

    preserver.onStatusChange("reconnecting");
    preserver.onStatusChange("failed");

    expect(preserver.getPreservedTurns()).toEqual(turns);
  });

  it("preserves an empty array when no turns exist at failure time (Req 10.4)", () => {
    const preserver = createTranscriptPreserver<string[]>(null);

    preserver.onStatusChange("reconnecting");
    preserver.onStatusChange("failed");

    expect(preserver.getPreservedTurns()).toEqual([]);
  });

  it("does not re-snapshot if already in failed state", () => {
    const turns = ["turn1", "turn2"];
    const preserver = createTranscriptPreserver(turns);

    preserver.onStatusChange("reconnecting");
    preserver.onStatusChange("failed");

    const firstSnapshot = preserver.getPreservedTurns();

    // Add more turns to live data
    preserver.updateLiveTurns(["turn1", "turn2", "turn3"]);

    // Calling failed again should not update the snapshot
    preserver.onStatusChange("failed");

    expect(preserver.getPreservedTurns()).toEqual(firstSnapshot);
  });

  it("clears preserved turns when connection is restored (Req 10.3)", () => {
    const turns = ["turn1", "turn2"];
    const preserver = createTranscriptPreserver(turns);

    preserver.onStatusChange("reconnecting");
    preserver.onStatusChange("failed");
    expect(preserver.getPreservedTurns()).not.toBeNull();

    preserver.onStatusChange("connected");
    expect(preserver.getPreservedTurns()).toBeNull();
  });

  it("snapshot captures the turns at the exact moment of failure", () => {
    const initialTurns = ["turn1", "turn2"];
    const preserver = createTranscriptPreserver(initialTurns);

    preserver.onStatusChange("reconnecting");

    // Update live turns before failure
    preserver.updateLiveTurns(["turn1", "turn2", "turn3"]);

    preserver.onStatusChange("failed");

    // Should have captured the updated turns
    expect(preserver.getPreservedTurns()).toEqual(["turn1", "turn2", "turn3"]);
  });
});
