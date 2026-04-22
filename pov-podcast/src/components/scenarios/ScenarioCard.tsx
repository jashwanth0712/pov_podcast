"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useConvexAuth } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";

// Minimal persona shape needed for the card
interface PersonaSummary {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  profileImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
}

interface ScenarioCardProps {
  id: Id<"scenarios">;
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  personas?: PersonaSummary[];
  contentDisclaimer?: string;
  /** If provided, called on click instead of navigating directly */
  onSelect?: (id: Id<"scenarios">) => void;
}

/** Era badge colour mapping */
const ERA_COLOURS: Record<string, string> = {
  Ancient: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Medieval: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Modern: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Contemporary: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/** Derive initials from a persona name for the fallback avatar */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Deterministic background colour for initials avatars */
const AVATAR_BG_COLOURS = [
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-lime-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
];

function avatarBg(index: number): string {
  return AVATAR_BG_COLOURS[index % AVATAR_BG_COLOURS.length];
}

/**
 * ScenarioCard — reusable card component for displaying a historical scenario.
 *
 * Displays:
 * - Era badge (top-left)
 * - Scenario title (bold)
 * - Time period subtitle
 * - Description (≤200 chars)
 * - Up to 6 small circular persona avatar thumbnails
 * - Content disclaimer (small, muted)
 *
 * Requirements: 1.3, 8.2
 */
export function ScenarioCard({
  id,
  title,
  timePeriod,
  era,
  description,
  personas = [],
  contentDisclaimer,
  onSelect,
}: ScenarioCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  // Navigate to session setup within 500ms (Req 1.4).
  // If onSelect is provided, call it instead (for opening detail sheet).
  // If the user isn't signed in, route them to /auth with a redirect back.
  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(id);
      return;
    }
    const target = `/session/setup/${id}`;
    if (isAuthenticated) {
      router.push(target);
    } else {
      router.push(`/auth?redirect=${encodeURIComponent(target)}`);
    }
  }, [router, id, isAuthenticated, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // Truncate description to 200 chars (Req 1.3)
  const displayDescription =
    description.length > 200 ? description.slice(0, 197) + "…" : description;

  // Show up to 6 persona avatars (Req 1.3)
  const visiblePersonas = personas.slice(0, 6);

  const eraBadgeClass = ERA_COLOURS[era] ?? "bg-zinc-100 text-zinc-700";

  const disclaimer =
    contentDisclaimer ??
    "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${timePeriod}. Click to start session.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="
        group relative flex flex-col gap-3 rounded-2xl border border-zinc-200
        bg-white p-5 shadow-sm transition-all duration-150
        hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600
        cursor-pointer select-none
      "
    >
      {/* Era badge */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${eraBadgeClass}`}
          aria-label={`Era: ${era}`}
        >
          {era}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>

      {/* Time period */}
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 -mt-2">
        {timePeriod}
      </p>

      {/* Description */}
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 flex-1">
        {displayDescription}
      </p>

      {/* Persona avatar row */}
      {visiblePersonas.length > 0 && (
        <div
          className="flex items-center gap-1.5 mt-1"
          aria-label={`${visiblePersonas.length} persona${visiblePersonas.length !== 1 ? "s" : ""}: ${visiblePersonas.map((p) => p.name).join(", ")}`}
        >
          {visiblePersonas.map((persona, i) => (
            <div
              key={persona._id}
              title={`${persona.name} — ${persona.historicalRole}`}
              className="relative"
            >
              {persona.avatarGenerationStatus === "complete" && persona.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={persona.profileImageUrl}
                  alt={persona.name}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
                />
              ) : (
                <div
                  className={`h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center text-[9px] font-bold text-white ${avatarBg(i)}`}
                  aria-hidden="true"
                >
                  {getInitials(persona.name)}
                </div>
              )}
            </div>
          ))}
          {personas.length > 6 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
              +{personas.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Content disclaimer (Req 8.2) */}
      <p className="mt-1 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2">
        {disclaimer}
      </p>
    </article>
  );
}
