"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScenarioCard } from "./ScenarioCard";

interface ScenarioDoc {
  _id: Id<"scenarios">;
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  personaIds: Id<"personas">[];
  contentDisclaimer: string;
  isPrebuilt: boolean;
  bannerImageUrl?: string | null;
}

interface MagazineGridProps {
  scenarios: ScenarioDoc[];
  onSelect?: (id: Id<"scenarios">) => void;
  isPending?: boolean;
}

function ScenarioCardWithPersonas({
  scenario,
  onSelect,
  size,
  className,
}: {
  scenario: ScenarioDoc;
  onSelect?: (id: Id<"scenarios">) => void;
  size: "large" | "medium" | "small";
  className?: string;
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
      bannerImageUrl={scenario.bannerImageUrl}
      onSelect={onSelect}
      size={size}
      className={className}
    />
  );
}

export function MagazineGrid({ scenarios, onSelect, isPending = false }: MagazineGridProps) {
  if (scenarios.length === 0) return null;

  const [featured, secondary, ...rest] = scenarios;
  const bottomCards = rest.slice(0, 3);

  return (
    <div
      className={`transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}
      aria-live="polite"
      aria-busy={isPending}
    >
      {/* Magazine layout - fixed grid matching reference */}
      <div className="grid grid-cols-3 gap-4" style={{ gridTemplateRows: "1fr auto" }}>
        {/* Top row */}
        <div className="col-span-3 grid grid-cols-3 gap-4" style={{ height: "400px" }}>
          {/* Featured large card - spans 2 cols */}
          {featured && (
            <div className="col-span-2 h-full">
              <ScenarioCardWithPersonas
                scenario={featured}
                onSelect={onSelect}
                size="large"
                className="h-full"
              />
            </div>
          )}

          {/* Secondary medium card */}
          {secondary && (
            <div className="col-span-1 h-full">
              <ScenarioCardWithPersonas
                scenario={secondary}
                onSelect={onSelect}
                size="medium"
                className="h-full"
              />
            </div>
          )}
        </div>

        {/* Bottom row - 3 small cards */}
        {bottomCards.length > 0 && (
          <div className="col-span-3 grid grid-cols-3 gap-4" style={{ height: "180px" }}>
            {bottomCards.map((scenario) => (
              <div key={scenario._id} className="h-full">
                <ScenarioCardWithPersonas
                  scenario={scenario}
                  onSelect={onSelect}
                  size="small"
                  className="h-full"
                />
              </div>
            ))}
            {/* Fill empty slots if less than 3 cards */}
            {bottomCards.length < 3 &&
              Array.from({ length: 3 - bottomCards.length }).map((_, i) => (
                <div key={`empty-${i}`} className="h-full" />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MagazineGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4" style={{ gridTemplateRows: "1fr auto" }}>
      {/* Top row */}
      <div className="col-span-3 grid grid-cols-3 gap-4" style={{ height: "400px" }}>
        {/* Featured skeleton */}
        <div className="col-span-2 h-full">
          <div
            className="animate-pulse h-full rounded-3xl border border-white/10 bg-white/5 overflow-hidden relative"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute top-4 left-4 flex -space-x-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-9 w-9 rounded-full bg-white/10" />
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 space-y-3">
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-white/10" />
                <div className="h-6 w-20 rounded-full bg-white/10" />
              </div>
              <div className="h-8 w-2/3 rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
            </div>
          </div>
        </div>

        {/* Secondary skeleton */}
        <div className="col-span-1 h-full">
          <div
            className="animate-pulse h-full rounded-3xl border border-white/10 bg-white/5 overflow-hidden relative"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-14 rounded-full bg-white/10" />
                <div className="h-5 w-16 rounded-full bg-white/10" />
              </div>
              <div className="h-6 w-3/4 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="col-span-3 grid grid-cols-3 gap-4" style={{ height: "180px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-full">
            <div
              className="animate-pulse h-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden relative"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
                <div className="h-4 w-12 rounded-full bg-white/10" />
                <div className="h-5 w-2/3 rounded bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
