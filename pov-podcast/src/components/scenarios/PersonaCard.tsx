"use client";

import type { Id } from "../../../convex/_generated/dataModel";

interface PersonaCardProps {
  id: Id<"personas">;
  name: string;
  historicalRole: string;
  personalityTraits: string[];
  emotionalBackstory: string;
  profileImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
  index?: number;
  onEdit?: (id: Id<"personas">) => void;
  onDelete?: (id: Id<"personas">) => void;
}

const AVATAR_BG = [
  "from-rose-500 to-pink-600",
  "from-orange-500 to-amber-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getGradient(index: number): string {
  return AVATAR_BG[index % AVATAR_BG.length];
}

export function PersonaCard({
  id,
  name,
  historicalRole,
  personalityTraits,
  emotionalBackstory,
  profileImageUrl,
  avatarGenerationStatus,
  index = 0,
  onEdit,
  onDelete,
}: PersonaCardProps) {
  const traits = personalityTraits.slice(0, 3);
  const shortBackstory =
    emotionalBackstory.length > 100
      ? emotionalBackstory.slice(0, 97) + "..."
      : emotionalBackstory;

  return (
    <div
      className="
        group/card relative rounded-2xl p-4
        bg-zinc-900 border border-white/5
        transition-all duration-300 ease-out
        hover:border-white/10 hover:bg-zinc-800/80
        hover:shadow-lg hover:shadow-purple-500/5
      "
    >
      {/* Edit & Delete buttons - top right */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(id);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
              aria-label={`Edit ${name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
              aria-label={`Delete ${name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Top: Avatar + Name + Tagline */}
      <div className="flex items-center gap-3 mb-3 pr-16">
        {avatarGenerationStatus === "complete" && profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileImageUrl}
            alt={name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div
            className={`h-12 w-12 rounded-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center text-sm font-bold text-white shadow-lg`}
          >
            {getInitials(name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base truncate">
            {name}
          </h4>
          <p className="text-xs text-white/50 truncate">
            {historicalRole}
          </p>
        </div>
      </div>

      {/* Middle: Trait Chips */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {traits.map((trait, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-white/5 text-white/70 rounded-full text-[10px] font-medium border border-white/5"
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Bottom: Short Backstory */}
      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
        {shortBackstory}
      </p>

      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
    </div>
  );
}
