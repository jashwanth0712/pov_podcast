"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet } from "../ui/Sheet";

interface ScenarioDetailSheetProps {
  scenarioId: Id<"scenarios"> | null;
  onClose: () => void;
}

const ERA_COLOURS: Record<string, string> = {
  Ancient: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Medieval: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Modern: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Contemporary: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const AVATAR_BG_COLOURS = [
  "bg-rose-400", "bg-orange-400", "bg-amber-400",
  "bg-lime-500", "bg-teal-500", "bg-sky-500",
  "bg-violet-500", "bg-pink-500",
];

function avatarBg(index: number): string {
  return AVATAR_BG_COLOURS[index % AVATAR_BG_COLOURS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ScenarioDetailSheet({ scenarioId, onClose }: ScenarioDetailSheetProps) {
  const router = useRouter();

  const scenario = useQuery(
    api.scenarios.getScenarioById,
    scenarioId ? { scenarioId } : "skip"
  );

  const personas = useQuery(
    api.scenarios.getPersonasForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const handleStartSession = () => {
    if (scenarioId) {
      router.push(`/session/setup/${scenarioId}`);
    }
  };

  const isLoading = scenario === undefined || personas === undefined;

  return (
    <Sheet
      open={scenarioId !== null}
      onClose={onClose}
      title={scenario?.title ?? "Loading..."}
      footer={
        <button
          onClick={handleStartSession}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
        >
          Start Session
        </button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : scenario ? (
        <div className="space-y-6">
          {/* Era & Time Period */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ERA_COLOURS[scenario.era] ?? "bg-zinc-100 text-zinc-700"}`}>
              {scenario.era}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {scenario.timePeriod}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {scenario.description}
          </p>

          {/* Personas */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Personas ({personas?.length ?? 0})
            </h3>
            <div className="space-y-4">
              {personas?.map((persona, index) => (
                <div
                  key={persona._id}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3"
                >
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3">
                    {persona.avatarGenerationStatus === "complete" && persona.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={persona.profileImageUrl}
                        alt={persona.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarBg(index)}`}
                      >
                        {getInitials(persona.name)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {persona.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {persona.historicalRole}
                      </p>
                    </div>
                  </div>

                  {/* Traits */}
                  <div className="flex flex-wrap gap-1.5">
                    {persona.personalityTraits.slice(0, 5).map((trait, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>

                  {/* Backstory */}
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Emotional Backstory
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {persona.emotionalBackstory}
                    </p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Speaking Style:</span>
                      <p className="text-zinc-700 dark:text-zinc-300">{persona.speakingStyle}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Ideological Position:</span>
                      <p className="text-zinc-700 dark:text-zinc-300">{persona.ideologicalPosition}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Origin:</span>
                      <p className="text-zinc-700 dark:text-zinc-300">{persona.geographicOrigin}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Age & Gender:</span>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {persona.estimatedAge} years, {persona.gender}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.
          </p>
        </div>
      ) : (
        <p className="text-zinc-500">Scenario not found.</p>
      )}
    </Sheet>
  );
}
