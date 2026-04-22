"use client";

import dynamic from "next/dynamic";

// ScenarioGenerator uses Convex actions and real-time queries — disable SSR.
const ScenarioGeneratorDynamic = dynamic(
  () =>
    import("@/components/scenarios/ScenarioGenerator").then(
      (m) => m.ScenarioGenerator
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </div>
    ),
  }
);

export default function ScenarioCreatePage() {
  return <ScenarioGeneratorDynamic />;
}
