"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScenarioDetailSheet } from "./ScenarioDetailSheet";
import { MagazineGrid, MagazineGridSkeleton } from "./MagazineGrid";
import { SessionHistory } from "../session/SessionHistory";
import { useRouter } from "next/navigation";

type Era = "All" | "Ancient" | "Medieval" | "Modern" | "Contemporary";

const ERA_FILTER_OPTIONS: Era[] = ["All", "Ancient", "Modern", "Contemporary"];

/**
 * HomePage — main landing page component.
 *
 * Renders:
 * - "Historical Scenarios" grid (12 pre-built cards)
 * - Era filter chips (All / Modern / Contemporary) — updates within 300ms (Req 1.6)
 * - "Your Scenarios" grid (user-generated)
 * - Content disclaimer on each card (Req 8.2)
 * - Navigation to SessionSetup on card click within 500ms (Req 1.4)
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 8.2
 */
export function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [selectedEra, setSelectedEra] = useState<Era>("All");
  const [selectedScenarioId, setSelectedScenarioId] = useState<Id<"scenarios"> | null>(null);
  // useTransition keeps the filter update non-blocking and within 300ms (Req 1.6)
  const [isPending, startTransition] = useTransition();

  const handleScenarioSelect = useCallback((id: Id<"scenarios">) => {
    setSelectedScenarioId(id);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedScenarioId(null);
  }, []);

  // Fetch all scenarios from Convex. Scenarios are public; user scenarios
  // require auth, so skip that query when signed out.
  const allScenarios = useQuery(api.scenarios.getScenarios, {});
  const userScenarios = useQuery(
    api.scenarios.getUserScenarios,
    isAuthenticated ? {} : "skip"
  );

  // Separate pre-built from user-generated
  const prebuiltScenarios = useMemo(
    () => (allScenarios ?? []).filter((s) => s.isPrebuilt),
    [allScenarios]
  );

  // Apply era filter to pre-built scenarios (Req 1.5, 1.6)
  const filteredPrebuilt = useMemo(() => {
    if (selectedEra === "All") return prebuiltScenarios;
    return prebuiltScenarios.filter((s) => s.era === selectedEra);
  }, [prebuiltScenarios, selectedEra]);

  const handleEraChange = (era: Era) => {
    // Use startTransition so the UI update is batched and stays within 300ms (Req 1.6)
    startTransition(() => {
      setSelectedEra(era);
    });
  };

  const handleCreateScenario = () => {
    if (isAuthenticated) {
      router.push("/scenario/create");
    } else {
      router.push(`/auth?redirect=${encodeURIComponent("/scenario/create")}`);
    }
  };

  const handleSignIn = () => {
    router.push("/auth");
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isLoading = allScenarios === undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Glassmorphic Header */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  POV Podcast
                </h1>
                <p className="text-[10px] text-white/50 hidden sm:block">
                  Experience history through every perspective
                </p>
              </div>
            </div>
            <nav aria-label="Main navigation" className="flex items-center gap-3">
              <button
                onClick={handleCreateScenario}
                className="
                  inline-flex items-center gap-2 rounded-full bg-white px-4 py-2
                  text-sm font-semibold text-zinc-900 shadow-lg
                  hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
                  transition-all duration-200
                "
                aria-label="Create a new scenario"
              >
                <span aria-hidden="true">+</span>
                <span className="hidden sm:inline">Create Scenario</span>
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  className="
                    inline-flex items-center rounded-full border border-white/20
                    bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/90
                    hover:bg-white/20 hover:border-white/30
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                    transition-all duration-200
                  "
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="
                    inline-flex items-center rounded-full border border-white/20
                    bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/90
                    hover:bg-white/20 hover:border-white/30
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                    transition-all duration-200
                  "
                  aria-label="Sign in"
                >
                  Sign in
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* ── Historical Scenarios section ── */}
        <section aria-labelledby="historical-scenarios-heading">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <h2
                id="historical-scenarios-heading"
                className="text-3xl font-bold text-white"
              >
                Historical Scenarios
              </h2>
              <p className="text-sm text-white/60 mt-2">
                Curated events — step into the perspectives that shaped history
              </p>
            </div>

            {/* Glassmorphic filter chips */}
            <div
              role="group"
              aria-label="Filter scenarios by era"
              className="flex items-center gap-2 flex-wrap p-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10"
            >
              {ERA_FILTER_OPTIONS.map((era) => (
                <button
                  key={era}
                  onClick={() => handleEraChange(era)}
                  aria-pressed={selectedEra === era}
                  className={`
                    rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                    ${
                      selectedEra === era
                        ? "bg-white text-zinc-900 shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          {/* Magazine-style scenario grid */}
          {isLoading ? (
            <MagazineGridSkeleton count={6} />
          ) : filteredPrebuilt.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm py-20 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-white/60 text-sm">
                No scenarios found for the &ldquo;{selectedEra}&rdquo; era.
              </p>
              <button
                onClick={() => handleEraChange("All")}
                className="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Show all eras
              </button>
            </div>
          ) : (
            <MagazineGrid
              scenarios={filteredPrebuilt}
              onSelect={handleScenarioSelect}
              isPending={isPending}
            />
          )}
        </section>

        {/* ── Your Scenarios section ── */}
        <section aria-labelledby="your-scenarios-heading">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                id="your-scenarios-heading"
                className="text-3xl font-bold text-white"
              >
                Your Scenarios
              </h2>
              <p className="text-sm text-white/60 mt-2">
                Scenarios you&apos;ve generated from your own topics
              </p>
            </div>
            <button
              onClick={handleCreateScenario}
              className="
                inline-flex items-center gap-2 rounded-full border border-white/20
                bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/90
                hover:bg-white/20 hover:border-white/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                transition-all duration-200
              "
              aria-label="Create a new scenario"
            >
              <span aria-hidden="true">+</span>
              New Scenario
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm py-20 text-center px-6">
              <h3 className="text-base font-semibold text-white">
                Sign in to create and view your scenarios
              </h3>
              <p className="mt-2 text-sm text-white/60 max-w-xs">
                Your custom scenarios are saved to your account.
              </p>
              <button
                onClick={handleSignIn}
                className="
                  mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5
                  text-sm font-semibold text-zinc-900 shadow-lg
                  hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
                  transition-all duration-200
                "
              >
                Sign in
              </button>
            </div>
          ) : userScenarios === undefined ? (
            <MagazineGridSkeleton count={3} />
          ) : userScenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm py-20 text-center px-6">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 backdrop-blur-sm"
                aria-hidden="true"
              >
                <svg
                  className="h-7 w-7 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">
                No custom scenarios yet
              </h3>
              <p className="mt-2 text-sm text-white/60 max-w-xs">
                Generate a scenario from any historical topic — a battle, a discovery, a social movement.
              </p>
              <button
                onClick={handleCreateScenario}
                className="
                  mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5
                  text-sm font-semibold text-zinc-900 shadow-lg
                  hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
                  transition-all duration-200
                "
              >
                Create your first scenario
              </button>
            </div>
          ) : (
            <MagazineGrid scenarios={userScenarios} />
          )}
        </section>

        {/* ── Session History section ── */}
        {isAuthenticated && (
          <section aria-labelledby="session-history-heading">
            <div className="mb-6">
              <h2
                id="session-history-heading"
                className="text-3xl font-bold text-white"
              >
                Your Sessions
              </h2>
              <p className="text-sm text-white/60 mt-2">
                Pick up where you left off — sessions ordered by most recent activity
              </p>
            </div>
            <SessionHistory />
          </section>
        )}
      </main>

      {/* Scenario detail sheet for pre-built scenarios */}
      <ScenarioDetailSheet
        scenarioId={selectedScenarioId}
        onClose={handleSheetClose}
      />
    </div>
  );
}

