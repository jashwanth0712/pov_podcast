"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet } from "../../components/ui/Sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParticipantsSheetProps {
  sessionId: Id<"sessions">;
  open: boolean;
  onClose: () => void;
}

// ─── Mood config ──────────────────────────────────────────────────────────────

type Mood = "calm" | "frustrated" | "passionate" | "defensive" | "resigned";

const MOOD_CONFIG: Record<
  Mood,
  { label: string; icon: string; badgeClass: string; bgColour: string }
> = {
  calm: {
    label: "Calm",
    icon: "😌",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    bgColour: "#60a5fa",
  },
  frustrated: {
    label: "Frustrated",
    icon: "😤",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
    bgColour: "#f87171",
  },
  passionate: {
    label: "Passionate",
    icon: "🔥",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    bgColour: "#fb923c",
  },
  defensive: {
    label: "Defensive",
    icon: "🛡️",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    bgColour: "#a78bfa",
  },
  resigned: {
    label: "Resigned",
    icon: "😔",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    bgColour: "#94a3b8",
  },
};

/** Colour palette for avatar backgrounds (cycles by index). */
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      className="flex items-center justify-center py-10"
      role="status"
      aria-label="Loading participants"
    >
      <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
    </div>
  );
}

// ─── ParticipantsSheet ────────────────────────────────────────────────────────

/**
 * ParticipantsSheet — bottom sheet listing all personas in the session.
 *
 * Requirements: 14.7, 17.4, 20.4
 */
export function ParticipantsSheet({
  sessionId,
  open,
  onClose,
}: ParticipantsSheetProps) {
  const session = useQuery(api.sessions.getSession, { sessionId });
  const personaStates = useQuery(api.sessions.getPersonaStates, { sessionId });

  const scenarioId = session?.scenarioId;
  const personas = useQuery(
    api.scenarios.getPersonasForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const isLoading =
    session === undefined || personaStates === undefined || personas === undefined;

  return (
    <Sheet open={open} onClose={onClose} title="Participants">
      <div aria-label="Session participants list">
        {isLoading ? (
          <Spinner />
        ) : !personas || personas.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">
            No participants yet.
          </p>
        ) : (
          <ul role="list" className="space-y-3" aria-label="Persona participants">
            {personas.map((persona, index) => {
              const state = personaStates?.find(
                (s) => s.personaId === persona._id
              );
              const mood = (state?.emotionalState?.mood ?? "calm") as Mood;
              const moodCfg = MOOD_CONFIG[mood];
              const hasAvatar =
                persona.avatarGenerationStatus === "complete" &&
                persona.profileImageUrl;
              const initials = getInitials(persona.name);

              return (
                <li
                  key={persona._id}
                  role="listitem"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {hasAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={persona.profileImageUrl!}
                        alt={persona.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white select-none ${avatarBg(index)}`}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name and role */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">
                      {persona.name}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {persona.historicalRole}
                    </p>
                  </div>

                  {/* Emotional state badge */}
                  <span
                    className={`
                      inline-flex items-center gap-1 rounded-full border px-2 py-0.5
                      text-xs font-medium flex-shrink-0
                      ${moodCfg.badgeClass}
                    `}
                    aria-label={`Emotional state: ${moodCfg.label}`}
                  >
                    <span aria-hidden="true">{moodCfg.icon}</span>
                    {moodCfg.label}
                  </span>
                </li>
              );
            })}

            {/* Moderator entry */}
            <li
              role="listitem"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              {/* Moderator icon */}
              <div className="flex-shrink-0">
                <div
                  className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg select-none"
                  aria-hidden="true"
                >
                  🎙️
                </div>
              </div>

              {/* Name and description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90 truncate">
                  Moderator
                </p>
                <p className="text-xs text-white/50 truncate">
                  Manages conversation flow
                </p>
              </div>

              {/* Neutral badge */}
              <span
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/50 flex-shrink-0"
                aria-label="Role: Neutral"
              >
                Neutral
              </span>
            </li>
          </ul>
        )}
      </div>
    </Sheet>
  );
}
