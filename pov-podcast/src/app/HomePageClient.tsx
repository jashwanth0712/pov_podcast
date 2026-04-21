"use client";

import dynamic from "next/dynamic";

// HomePage uses Convex real-time queries (useQuery) which require the browser
// environment and the Convex provider. Disable SSR to prevent prerender errors.
const HomePageDynamic = dynamic(
  () => import("@/components/scenarios/HomePage").then((m) => m.HomePage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading…</div>
      </div>
    ),
  }
);

export function HomePageClient() {
  return <HomePageDynamic />;
}
