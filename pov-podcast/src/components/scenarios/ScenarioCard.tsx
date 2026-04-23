"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useConvexAuth } from "convex/react";
import Image from "next/image";

import type { Id } from "../../../convex/_generated/dataModel";

interface PersonaSummary {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  profileImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
}

type CardSize = "large" | "medium" | "small";

const DEFAULT_DISCLAIMER =
  "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.";

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
  titleClamp: string;
  descLines: string;
  descLimit: number;
  padding: string;
  avatarSize: string;
  maxAvatars: number;
  rounded: string;
  showDescription: boolean;
  showDisclaimer: boolean;
}> = {
  large: {
    titleClass: "text-2xl sm:text-3xl",
    titleClamp: "line-clamp-2",
    descLines: "line-clamp-2",
    descLimit: 200,
    padding: "p-5 sm:p-6",
    avatarSize: "h-9 w-9",
    maxAvatars: 6,
    rounded: "rounded-3xl",
    showDescription: true,
    showDisclaimer: true,
  },
  medium: {
    titleClass: "text-lg sm:text-xl",
    titleClamp: "line-clamp-2",
    descLines: "line-clamp-2",
    descLimit: 200,
    padding: "p-4 sm:p-5",
    avatarSize: "h-8 w-8",
    maxAvatars: 6,
    rounded: "rounded-3xl",
    showDescription: true,
    showDisclaimer: true,
  },
  small: {
    titleClass: "text-base sm:text-lg",
    titleClamp: "line-clamp-1",
    descLines: "line-clamp-1",
    descLimit: 120,
    padding: "p-3 sm:p-4",
    avatarSize: "h-6 w-6",
    maxAvatars: 4,
    rounded: "rounded-2xl",
    showDescription: false,
    showDisclaimer: false,
  },
};

// On small cards, prefer the part of the title before the first colon so
// long two-part titles ("Jack the Ripper: The Whitechapel Murders") fit on
// one line instead of clipping mid-word.
function shortenTitleForSmall(title: string): string {
  const colon = title.indexOf(":");
  if (colon > 0 && colon < title.length - 1) {
    return title.slice(0, colon);
  }
  return title;
}

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
  contentDisclaimer = DEFAULT_DISCLAIMER,
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

  // Prefetch the session setup route on hover to reduce navigation latency (Req 10.1)
  const handleMouseEnter = useCallback(() => {
    if (!onSelect) {
      const target = `/session/setup/${id}`;
      router.prefetch(target);
    }
  }, [router, id, onSelect]);

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

  const visiblePersonas = personas.slice(0, config.maxAvatars);
  const extraCount =
    personas.length > config.maxAvatars ? personas.length - config.maxAvatars : 0;

  const displayTitle = size === "small" ? shortenTitleForSmall(title) : title;

  const eraBadgeClass = ERA_COLOURS[era] ?? "bg-zinc-500/20 text-zinc-200 border-zinc-400/30";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${timePeriod}. Click to start session.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
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
          <Image
            src={bannerImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Content overlay - bottom */}
      <div className={`absolute inset-x-0 bottom-0 ${config.padding} flex flex-col gap-2`}>
        {/* Era badge + persona avatars on one row so they never collide with the title on short cards */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md border ${eraBadgeClass}`}
            aria-label={`Era: ${era}`}
          >
            {era}
          </span>
          {visiblePersonas.length > 0 && (
            <div
              className="flex items-center gap-2"
              aria-label={`${visiblePersonas.length} persona${visiblePersonas.length !== 1 ? "s" : ""}`}
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
                      <Image
                        src={persona.profileImageUrl}
                        alt={persona.name}
                        width={36}
                        height={36}
                        className={`${config.avatarSize} rounded-full object-cover ring-2 ring-white/20 shadow-lg`}
                        loading="lazy"
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
                  {`+${extraCount}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className={`${config.titleClass} ${config.titleClamp} font-bold leading-tight text-white drop-shadow-lg`}
          title={title}
        >
          {displayTitle}
        </h3>

        {/* Time period */}
        <p className="text-xs font-medium text-white/80">
          {timePeriod}
        </p>

        {/* Description */}
        {config.showDescription && (
          <p className={`text-sm leading-relaxed text-white/70 ${config.descLines}`}>
            {displayDescription}
          </p>
        )}

        {/* Content disclaimer (Req 8.2) */}
        {config.showDisclaimer && (
          <p className="text-[10px] leading-tight text-white/50 mt-1">
            {contentDisclaimer}
          </p>
        )}
      </div>

      {/* Glass border effect */}
      <div className={`absolute inset-0 ${config.rounded} ring-1 ring-inset ring-white/10 pointer-events-none`} />
    </article>
  );
}
