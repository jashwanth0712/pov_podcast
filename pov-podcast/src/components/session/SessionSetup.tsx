"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

type DepthLevel = "Casual" | "Intermediate" | "Scholar";
type TurnTakingMode = "Relevance" | "RoundRobin" | "Random";

// ─── Depth Level Config ───────────────────────────────────────────────────────

const DEPTH_LEVELS: {
  value: DepthLevel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "Casual",
    label: "Casual",
    description: "Accessible storytelling with emotional focus. Great for newcomers.",
    icon: "💬",
  },
  {
    value: "Intermediate",
    label: "Intermediate",
    description: "Balanced history and analysis. For curious learners.",
    icon: "📖",
  },
  {
    value: "Scholar",
    label: "Scholar",
    description: "Deep historiographical analysis. For serious students of history.",
    icon: "🎓",
  },
];

// ─── Turn-Taking Mode Config ──────────────────────────────────────────────────

const TURN_TAKING_MODES: {
  value: TurnTakingMode;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "Relevance",
    label: "Relevance",
    description: "AI selects the most emotionally and ideologically relevant speaker next.",
    icon: "🧠",
  },
  {
    value: "RoundRobin",
    label: "Round Robin",
    description: "Each persona speaks in a fixed rotation.",
    icon: "🔄",
  },
  {
    value: "Random",
    label: "Random",
    description: "Next speaker is chosen at random (never the same person twice in a row).",
    icon: "🎲",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SessionSetupProps {
  scenarioId: Id<"scenarios">;
}

// ─── SessionSetup ─────────────────────────────────────────────────────────────

/**
 * SessionSetup — pre-session configuration screen.
 *
 * - Depth level picker (Casual / Intermediate / Scholar) (Req 19.1, 19.2)
 * - Turn-taking mode selector (default: Relevance) (Req 14.10)
 * - Persists selected depth level to userPreferences (Req 19.5)
 * - Loads stored default depth level on mount (Req 19.5)
 * - Calls startSession mutation on "Start Session" (Req 3.3, 4.1)
 *
 * Requirements: 14.10, 19.1, 19.2, 19.4, 19.5
 */
export function SessionSetup({ scenarioId }: SessionSetupProps) {
  const router = useRouter();

  // Convex hooks
  const scenario = useQuery(api.scenarios.getScenarioById, { scenarioId });
  const userPreferences = useQuery(api.sessions.getUserPreferences);
  const startSession = useMutation(api.sessions.startSession);
  const updateUserDefaultDepthLevel = useMutation(
    api.sessions.updateUserDefaultDepthLevel
  );

  // Local state
  const [depthLevel, setDepthLevel] = useState<DepthLevel>("Intermediate");
  const [turnTakingMode, setTurnTakingMode] = useState<TurnTakingMode>("Relevance");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load stored default depth level from userPreferences (Req 19.5)
  useEffect(() => {
    if (userPreferences !== undefined && !prefsLoaded) {
      if (userPreferences?.defaultDepthLevel) {
        setDepthLevel(userPreferences.defaultDepthLevel);
      }
      setPrefsLoaded(true);
    }
  }, [userPreferences, prefsLoaded]);

  const handleDepthLevelChange = (level: DepthLevel) => {
    setDepthLevel(level);
  };

  const handleStartSession = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      // Persist the selected depth level as the user's new default (Req 19.5)
      await updateUserDefaultDepthLevel({ depthLevel });

      // Create the session (Req 3.3, 4.1, 14.10)
      const result = await startSession({
        scenarioId,
        depthLevel,
        turnTakingMode,
      });

      // Navigate to the session player
      router.push(`/session/${result.sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start session. Please try again."
      );
      setIsStarting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (scenario === undefined || userPreferences === undefined) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-zinc-950"
        role="status"
        aria-label="Loading session setup"
      >
        <div className="h-10 w-10 rounded-full border-4 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (scenario === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <p className="text-white/50">Scenario not found.</p>
      </div>
    );
  }

  const ERA_COLOURS: Record<string, string> = {
    Ancient: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Medieval: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Modern: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Contemporary: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="
              inline-flex items-center gap-1.5 text-sm font-medium text-white/40
              hover:text-white/70 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-white/20 rounded transition-colors
            "
            aria-label="Go back"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-base font-semibold text-white/80">Session Setup</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
        {/* Scenario summary */}
        <section aria-labelledby="scenario-heading">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ERA_COLOURS[scenario.era] ?? "bg-white/10 text-white/60 border-white/10"}`}
              >
                {scenario.era}
              </span>
              <span className="text-sm text-white/30">{scenario.timePeriod}</span>
            </div>
            <h2
              id="scenario-heading"
              className="text-xl font-bold text-white mb-2"
            >
              {scenario.title}
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              {scenario.description}
            </p>
          </div>
        </section>

        {/* Depth Level Picker */}
        <section aria-labelledby="depth-level-heading">
          <h3
            id="depth-level-heading"
            className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3"
          >
            Depth Level
          </h3>
          <p className="text-sm text-white/40 mb-4">
            Controls the complexity and analytical density of the conversation.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="depth-level-heading"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {DEPTH_LEVELS.map((level) => {
              const isSelected = depthLevel === level.value;
              return (
                <button
                  key={level.value}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleDepthLevelChange(level.value)}
                  className={`
                    relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-purple-500/50
                    ${
                      isSelected
                        ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_0_1px_rgba(168,85,247,0.3)]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                    }
                  `}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {level.icon}
                  </span>
                  <span
                    className={`text-sm font-semibold ${isSelected ? "text-purple-300" : "text-white/80"}`}
                  >
                    {level.label}
                  </span>
                  <span className="text-xs text-white/40 leading-relaxed">
                    {level.description}
                  </span>
                  {isSelected && (
                    <span className="absolute top-3 right-3">
                      <svg
                        className="h-4 w-4 text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Turn-Taking Mode Selector */}
        <section aria-labelledby="turn-taking-heading">
          <h3
            id="turn-taking-heading"
            className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3"
          >
            Turn-Taking Mode
          </h3>
          <p className="text-sm text-white/40 mb-4">
            Controls how the next speaker is selected during the conversation.
          </p>
          <div
            role="radiogroup"
            aria-labelledby="turn-taking-heading"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {TURN_TAKING_MODES.map((mode) => {
              const isSelected = turnTakingMode === mode.value;
              return (
                <button
                  key={mode.value}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTurnTakingMode(mode.value)}
                  className={`
                    relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left
                    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-purple-500/50
                    ${
                      isSelected
                        ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_0_1px_rgba(168,85,247,0.3)]"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                    }
                  `}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {mode.icon}
                  </span>
                  <span
                    className={`text-sm font-semibold ${isSelected ? "text-purple-300" : "text-white/80"}`}
                  >
                    {mode.label}
                  </span>
                  <span className="text-xs text-white/40 leading-relaxed">
                    {mode.description}
                  </span>
                  {isSelected && (
                    <span className="absolute top-3 right-3">
                      <svg
                        className="h-4 w-4 text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <p className="font-semibold mb-0.5">Failed to start session</p>
            <p className="text-red-400/80">{error}</p>
          </div>
        )}

        {/* Start Session CTA */}
        <div className="pt-2 pb-8">
          <button
            onClick={handleStartSession}
            disabled={isStarting}
            className="
              w-full rounded-xl bg-white px-6 py-4 text-base font-semibold text-zinc-900
              hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              transition-all duration-200 shadow-lg
            "
            aria-label={isStarting ? "Starting session…" : "Start session"}
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
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
                Starting…
              </span>
            ) : (
              "Start Session"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
