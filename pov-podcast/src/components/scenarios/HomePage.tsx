"use client";

import { useState, useMemo, useTransition } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { ScenarioCard } from "./ScenarioCard";
import { useRouter } from "next/navigation";

type Era = "All" | "Ancient" | "Medieval" | "Modern" | "Contemporary";

const ERA_FILTER_OPTIONS: Era[] = ["All", "Ancient", "Modern", "Contemporary"];

const CONTENT_DISCLAIMER =
  "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.";

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
  // useTransition keeps the filter update non-blocking and within 300ms (Req 1.6)
  const [isPending, startTransition] = useTransition();

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              POV Podcast
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Experience history through every perspective
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <button
              onClick={handleCreateScenario}
              className="
                inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2
                text-sm font-semibold text-white shadow-sm
                hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-500 focus-visible:ring-offset-2
                transition-colors
              "
              aria-label="Create a new scenario"
            >
              <span aria-hidden="true">+</span>
              Create Scenario
            </button>
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="
                  inline-flex items-center rounded-full border border-zinc-200
                  bg-white px-4 py-2 text-sm font-semibold text-zinc-700
                  hover:bg-zinc-50 hover:border-zinc-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700
                  transition-colors
                "
                aria-label="Sign out"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="
                  inline-flex items-center rounded-full border border-zinc-200
                  bg-white px-4 py-2 text-sm font-semibold text-zinc-700
                  hover:bg-zinc-50 hover:border-zinc-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700
                  transition-colors
                "
                aria-label="Sign in"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* ── Historical Scenarios section ── */}
        <section aria-labelledby="historical-scenarios-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2
                id="historical-scenarios-heading"
                className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                Historical Scenarios
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Curated events — step into the perspectives that shaped history
              </p>
            </div>

            {/* Era filter chips (Req 1.5, 1.6) */}
            <div
              role="group"
              aria-label="Filter scenarios by era"
              className="flex items-center gap-2 flex-wrap"
            >
              {ERA_FILTER_OPTIONS.map((era) => (
                <button
                  key={era}
                  onClick={() => handleEraChange(era)}
                  aria-pressed={selectedEra === era}
                  className={`
                    rounded-full px-4 py-1.5 text-sm font-medium transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${
                      selectedEra === era
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                    }
                  `}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario grid */}
          {isLoading ? (
            <ScenarioGridSkeleton count={12} />
          ) : filteredPrebuilt.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                No scenarios found for the &ldquo;{selectedEra}&rdquo; era.
              </p>
              <button
                onClick={() => handleEraChange("All")}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Show all eras
              </button>
            </div>
          ) : (
            <div
              className={`
                grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                transition-opacity duration-150
                ${isPending ? "opacity-60" : "opacity-100"}
              `}
              aria-live="polite"
              aria-busy={isPending}
            >
              {filteredPrebuilt.map((scenario) => (
                <ScenarioCardWithPersonas
                  key={scenario._id}
                  scenario={scenario}
                  contentDisclaimer={CONTENT_DISCLAIMER}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Your Scenarios section ── */}
        <section aria-labelledby="your-scenarios-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                id="your-scenarios-heading"
                className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                Your Scenarios
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Scenarios you&apos;ve generated from your own topics
              </p>
            </div>
            <button
              onClick={handleCreateScenario}
              className="
                inline-flex items-center gap-2 rounded-full border border-zinc-200
                bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm
                hover:bg-zinc-50 hover:border-zinc-300
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700
                transition-colors
              "
              aria-label="Create a new scenario"
            >
              <span aria-hidden="true">+</span>
              New Scenario
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 py-20 text-center px-6">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Sign in to create and view your scenarios
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                Your custom scenarios are saved to your account.
              </p>
              <button
                onClick={handleSignIn}
                className="
                  mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5
                  text-sm font-semibold text-white shadow-sm
                  hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  transition-colors
                "
              >
                Sign in
              </button>
            </div>
          ) : userScenarios === undefined ? (
            <ScenarioGridSkeleton count={3} />
          ) : userScenarios.length === 0 ? (
            /* Empty state CTA */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 py-20 text-center px-6">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30"
                aria-hidden="true"
              >
                <svg
                  className="h-7 w-7 text-blue-500"
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
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                No custom scenarios yet
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                Generate a scenario from any historical topic — a battle, a discovery, a social movement.
              </p>
              <button
                onClick={handleCreateScenario}
                className="
                  mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5
                  text-sm font-semibold text-white shadow-sm
                  hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  transition-colors
                "
              >
                Create your first scenario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userScenarios.map((scenario) => (
                <ScenarioCardWithPersonas
                  key={scenario._id}
                  scenario={scenario}
                  contentDisclaimer={CONTENT_DISCLAIMER}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

import type { Id } from "../../../convex/_generated/dataModel";

interface ScenarioDoc {
  _id: Id<"scenarios">;
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  personaIds: Id<"personas">[];
  contentDisclaimer: string;
  isPrebuilt: boolean;
}

/**
 * Wrapper that fetches personas for a scenario and renders a ScenarioCard.
 * Kept separate so each card independently subscribes to its persona data.
 */
function ScenarioCardWithPersonas({
  scenario,
  contentDisclaimer,
}: {
  scenario: ScenarioDoc;
  contentDisclaimer: string;
}) {
  const personas = useQuery(api.scenarios.getPersonasForScenario, {
    scenarioId: scenario._id,
  });

  return (
    <ScenarioCard
      id={scenario._id}
      title={scenario.title}
      timePeriod={scenario.timePeriod}
      era={scenario.era}
      description={scenario.description}
      personas={personas ?? []}
      contentDisclaimer={contentDisclaimer}
    />
  );
}

/** Skeleton placeholder grid shown while data loads */
function ScenarioGridSkeleton({ count }: { count: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading scenarios…"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-3"
          aria-hidden="true"
        >
          <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="flex gap-1.5 pt-1">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
