"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useConvexAuth } from "convex/react";

import type { Id } from "../../../convex/_generated/dataModel";

interface PersonaSummary {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  profileImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
}

type CardSize = "large" | "medium" | "small";

interface ScenarioCardProps {
  id: Id<"scenarios">;
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  personas?: PersonaSummary[];
  contentDisclaimer?: string;
  bannerImageUrl?: string | null;
  onSelect?: (id: Id<"scenarios">) => void;
  size?: CardSize;
  className?: string;
}

const SIZE_CONFIG: Record<CardSize, {
  titleClass: string;
  descLines: string;
  descLimit: number;
  padding: string;
  avatarSize: string;
  rounded: string;
}> = {
  large: {
    titleClass: "text-2xl sm:text-3xl",
    descLines: "line-clamp-2",
    descLimit: 180,
    padding: "p-5 sm:p-6",
    avatarSize: "h-9 w-9",
    rounded: "rounded-3xl",
  },
  medium: {
    titleClass: "text-lg sm:text-xl",
    descLines: "line-clamp-2",
    descLimit: 100,
    padding: "p-4 sm:p-5",
    avatarSize: "h-8 w-8",
    rounded: "rounded-3xl",
  },
  small: {
    titleClass: "text-base sm:text-lg",
    descLines: "line-clamp-1",
    descLimit: 60,
    padding: "p-3 sm:p-4",
    avatarSize: "h-7 w-7",
    rounded: "rounded-2xl",
  },
};

const ERA_COLOURS: Record<string, string> = {
  Ancient: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  Medieval: "bg-purple-500/20 text-purple-200 border-purple-400/30",
  Modern: "bg-blue-500/20 text-blue-200 border-blue-400/30",
  Contemporary: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_BG_COLOURS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
];

function avatarBg(index: number): string {
  return AVATAR_BG_COLOURS[index % AVATAR_BG_COLOURS.length];
}

export function ScenarioCard({
  id,
  title,
  timePeriod,
  era,
  description,
  personas = [],
  bannerImageUrl,
  onSelect,
  size = "medium",
  className = "",
}: ScenarioCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const config = SIZE_CONFIG[size];

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

  const displayDescription =
    description.length > config.descLimit
      ? description.slice(0, config.descLimit - 3) + "…"
      : description;

  const visiblePersonas = personas.slice(0, 4);
  const extraCount = personas.length > 4 ? personas.length - 4 : 0;

  const eraBadgeClass = ERA_COLOURS[era] ?? "bg-zinc-500/20 text-zinc-200 border-zinc-400/30";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${timePeriod}. Click to start session.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        group relative ${config.rounded} overflow-hidden cursor-pointer select-none
        border border-white/10 bg-zinc-900/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-black/30 hover:border-white/20
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        ${className}
      `}
    >
      {/* Background image */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900">
        {bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Persona avatars - top left, stacked and overlapping (like reference) */}
      {visiblePersonas.length > 0 && (
        <div
          className="absolute top-4 left-4 flex items-center gap-2"
          aria-label={`${personas.length} persona${personas.length !== 1 ? "s" : ""}`}
        >
          <div className="flex -space-x-2">
            {visiblePersonas.map((persona, i) => (
              <div
                key={persona._id}
                title={`${persona.name} — ${persona.historicalRole}`}
                className="relative"
                style={{ zIndex: visiblePersonas.length - i }}
              >
                {persona.avatarGenerationStatus === "complete" && persona.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={persona.profileImageUrl}
                    alt={persona.name}
                    className={`${config.avatarSize} rounded-full object-cover ring-2 ring-white/20 shadow-lg`}
                  />
                ) : (
                  <div
                    className={`${config.avatarSize} rounded-full ring-2 ring-white/20 shadow-lg flex items-center justify-center text-[10px] font-bold text-white ${avatarBg(i)}`}
                    aria-hidden="true"
                  >
                    {getInitials(persona.name)}
                  </div>
                )}
              </div>
            ))}
          </div>
          {extraCount > 0 && (
            <span className="text-xs font-medium text-white/80">
              +{extraCount} More
            </span>
          )}
        </div>
      )}

      {/* Content overlay - bottom */}
      <div className={`absolute inset-x-0 bottom-0 ${config.padding} flex flex-col gap-2`}>
        {/* Era badge */}
        <div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md border ${eraBadgeClass}`}
            aria-label={`Era: ${era}`}
          >
            {era}
          </span>
        </div>

        {/* Title */}
        <h3 className={`${config.titleClass} font-bold leading-tight text-white drop-shadow-lg`}>
          {title}
        </h3>

        {/* Time period */}
        <p className="text-xs font-medium text-white/70">
          {timePeriod}
        </p>

        {/* Description */}
        <p className={`text-sm leading-relaxed text-white/60 ${config.descLines}`}>
          {displayDescription}
        </p>
      </div>

      {/* Glass border effect */}
      <div className={`absolute inset-0 ${config.rounded} ring-1 ring-inset ring-white/10 pointer-events-none`} />
    </article>
  );
}
