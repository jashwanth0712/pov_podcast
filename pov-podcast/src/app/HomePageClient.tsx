"use client";

import dynamic from "next/dynamic";
import { MagazineGridSkeleton } from "@/components/scenarios/MagazineGrid";

// HomePage uses Convex real-time queries (useQuery) which require the browser
// environment and the Convex provider. Disable SSR to prevent prerender errors.
// The loading skeleton matches the actual layout to minimise layout shift (Req 10.1).
const HomePageDynamic = dynamic(
  () => import("@/components/scenarios/HomePage").then((m) => m.HomePage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Skeleton header */}
        <header className="sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-32 rounded-full bg-white/10 animate-pulse" />
                <div className="h-8 w-20 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        {/* Skeleton content */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
          <section>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
              <div className="space-y-2">
                <div className="h-9 w-56 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-72 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="h-10 w-64 rounded-full bg-white/10 animate-pulse" />
            </div>
            <MagazineGridSkeleton count={5} />
          </section>
        </main>
      </div>
    ),
  }
);

export function HomePageClient() {
  return <HomePageDynamic />;
}
