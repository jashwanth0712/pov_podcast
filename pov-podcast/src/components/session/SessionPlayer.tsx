"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ControlsBar } from "./ControlsBar";
import { TranscriptPanel } from "./TranscriptPanel";
import { ReconnectionBanner } from "./ReconnectionBanner";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import {
  VoiceEngine,
  mapEmotionalStateToVoiceParams,
  stripStageDirections,
} from "../../lib/voiceEngine";

// Default ElevenLabs voice id for moderator turns (Rachel — widely available).
const MODERATOR_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmotionalState {
  mood: "calm" | "frustrated" | "passionate" | "defensive" | "resigned";
  convictionLevel: number;
  willingnessToConcede: number;
}

interface PersonaWithState {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  profileImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
  emotionalState?: EmotionalState;
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<
  EmotionalState["mood"],
  { label: string; icon: string; ringColour: string; badgeClass: string }
> = {
  calm: {
    label: "Calm",
    icon: "😌",
    ringColour: "#60a5fa", // blue-400
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  frustrated: {
    label: "Frustrated",
    icon: "😤",
    ringColour: "#f87171", // red-400
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  passionate: {
    label: "Passionate",
    icon: "🔥",
    ringColour: "#fb923c", // orange-400
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  defensive: {
    label: "Defensive",
    icon: "🛡️",
    ringColour: "#a78bfa", // violet-400
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  resigned: {
    label: "Resigned",
    icon: "😔",
    ringColour: "#94a3b8", // slate-400
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-500/30",
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

/** Returns initials from a name (up to 2 chars). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── StageArea ────────────────────────────────────────────────────────────────

interface StageAreaProps {
  /** The currently speaking persona, or null if no one is speaking. */
  speakingPersona: PersonaWithState | null;
  /** Whether the session is paused (reduces opacity of last speaker). */
  isPaused?: boolean;
  /** Index of the persona in the full list (for avatar colour). */
  personaIndex?: number;
  /** Voice engine ref, used to poll live amplitude for the rhythmic halo. */
  voiceEngineRef?: React.RefObject<VoiceEngine | null>;
  /** True while audio is actively playing for the speaking persona. */
  isActivelySpeaking?: boolean;
}

/**
 * StageArea — displays the currently speaking persona with a large avatar
 * (~120px), animated pulsing coloured ring, name, role, and emotional state badge.
 *
 * When no persona is speaking (paused), the last speaker's avatar remains at
 * reduced opacity.
 *
 * Requirements: 3.7, 4.2, 9.3, 9.5, 21.7, 22.4
 */
export function StageArea({
  speakingPersona,
  isPaused = false,
  personaIndex = 0,
  voiceEngineRef,
  isActivelySpeaking = false,
}: StageAreaProps) {
  const mood = speakingPersona?.emotionalState?.mood ?? "calm";
  const moodCfg = MOOD_CONFIG[mood];
  const initials = speakingPersona ? getInitials(speakingPersona.name) : "?";
  const hasAvatar =
    speakingPersona?.avatarGenerationStatus === "complete" &&
    speakingPersona?.profileImageUrl;

  // Refs we write to on every rAF tick — avoids React reconciliation.
  const haloRef = useRef<HTMLSpanElement | null>(null);
  const ringBorderRef = useRef<HTMLDivElement | null>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!isActivelySpeaking || isPaused || !speakingPersona) {
      // Reset to resting state.
      if (haloRef.current) {
        haloRef.current.style.transform = "scale(1)";
        haloRef.current.style.opacity = "0.15";
      }
      if (ringBorderRef.current) {
        ringBorderRef.current.style.boxShadow = `0 0 18px ${moodCfg.ringColour}33`;
      }
      smoothedRef.current = 0;
      return;
    }

    let raf = 0;
    const tick = () => {
      const amp = voiceEngineRef?.current?.getAmplitude() ?? 0;
      // Exponential smoothing so the halo breathes instead of twitching.
      const smoothed = smoothedRef.current * 0.7 + amp * 0.3;
      smoothedRef.current = smoothed;

      if (haloRef.current) {
        const scale = 1 + smoothed * 0.45;
        const opacity = 0.22 + smoothed * 0.55;
        haloRef.current.style.transform = `scale(${scale.toFixed(3)})`;
        haloRef.current.style.opacity = opacity.toFixed(3);
      }
      if (ringBorderRef.current) {
        const glowAlpha = Math.round((0.3 + smoothed * 0.7) * 255)
          .toString(16)
          .padStart(2, "0");
        const spread = 24 + smoothed * 36;
        ringBorderRef.current.style.boxShadow = `0 0 ${spread.toFixed(0)}px ${moodCfg.ringColour}${glowAlpha}`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActivelySpeaking, isPaused, speakingPersona, moodCfg.ringColour, voiceEngineRef]);

  // Announcement text for screen readers — updated simultaneously with visual
  // changes so users relying on audio receive the same info (Req 9.5).
  const speakerAnnouncement = speakingPersona
    ? `Now speaking: ${speakingPersona.name}, ${speakingPersona.historicalRole}. Mood: ${moodCfg.label}.`
    : isPaused
    ? "Session paused."
    : "Waiting to begin.";

  return (
    <div
      className="flex flex-col items-center gap-4 py-8"
      role="region"
      aria-label="Currently speaking"
    >
      {/* Screen-reader live region — announces speaker changes simultaneously
          with the visual update (Req 9.5). aria-atomic ensures the full
          announcement is read as one unit. */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {speakerAnnouncement}
      </div>
      {/* Large avatar with amplitude-driven halo */}
      <div className="relative flex items-center justify-center">
        {/* Outer halo — scale + opacity written each frame from TTS amplitude */}
        {speakingPersona && (
          <span
            ref={haloRef}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              backgroundColor: moodCfg.ringColour,
              opacity: 0.15,
              transform: "scale(1)",
              transition: "background-color 500ms ease-out",
              willChange: "transform, opacity",
            }}
            aria-hidden="true"
          />
        )}

        {/* Coloured ring border + mood-coloured glow (box-shadow) */}
        <div
          ref={ringBorderRef}
          className="relative rounded-full p-[3px]"
          style={{
            background: speakingPersona
              ? moodCfg.ringColour
              : "rgba(255,255,255,0.1)",
            opacity: isPaused ? 0.5 : 1,
            transition:
              "background-color 500ms ease-out, box-shadow 250ms ease-out, opacity 300ms ease-out",
            boxShadow: speakingPersona
              ? `0 0 18px ${moodCfg.ringColour}33`
              : "none",
          }}
        >
          {/* Avatar image or initials fallback */}
          <div
            className={`
              h-[120px] w-[120px] rounded-full overflow-hidden flex items-center justify-center
              text-2xl font-bold text-white select-none
              ${hasAvatar ? "" : avatarBg(personaIndex)}
            `}
          >
            {hasAvatar ? (
              <Image
                src={speakingPersona!.profileImageUrl!}
                alt={speakingPersona!.name}
                width={120}
                height={120}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
        </div>
      </div>

      {/* Persona name, role, and emotional state badge */}
      {speakingPersona ? (
        <div
          className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${isPaused ? "opacity-50" : "opacity-100"}`}
        >
          <p className="text-lg font-bold text-white text-center">
            {speakingPersona.name}
          </p>
          <p className="text-sm text-white/60 text-center">
            {speakingPersona.historicalRole}
          </p>

          {/* Emotional state pill — colour transitions smoothly as mood shifts */}
          <span
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1
              text-xs font-semibold transition-colors duration-500
              ${moodCfg.badgeClass}
            `}
            aria-label={`Emotional state: ${moodCfg.label}`}
          >
            <span aria-hidden="true">{moodCfg.icon}</span>
            <span>Feeling {moodCfg.label.toLowerCase()}</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-white/50">Waiting to begin…</p>
        </div>
      )}
    </div>
  );
}

// ─── PersonaGrid ──────────────────────────────────────────────────────────────

interface PersonaGridProps {
  /** All personas in the session (excluding the currently speaking one). */
  personas: PersonaWithState[];
  /** The ID of the currently speaking persona (to show ring on their grid cell). */
  speakingPersonaId: Id<"personas"> | null;
  /** The session ID (for forceNextSpeaker mutation). */
  sessionId: Id<"sessions">;
  /** Whether the current user's avatar should be shown in the grid. */
  showUserAvatar?: boolean;
}

/**
 * PersonaGrid — responsive 4-column grid of all persona avatars (~64px).
 *
 * - Per-avatar speaking ring activation when that persona is speaking
 * - User's own avatar labelled "You"
 * - Tapping a persona avatar shows a popover with "Force speak next" option
 *   wired to the forceNextSpeaker mutation
 * - Initials-based fallback avatar when avatarGenerationStatus !== "complete"
 *
 * Requirements: 4.2, 14.7, 15.7, 17.7, 22.4
 */
export function PersonaGrid({
  personas,
  speakingPersonaId,
  sessionId,
  showUserAvatar = true,
}: PersonaGridProps) {
  const [openPopoverId, setOpenPopoverId] = useState<Id<"personas"> | null>(null);
  const [forcingId, setForcingId] = useState<Id<"personas"> | null>(null);
  const [forceError, setForceError] = useState<string | null>(null);

  const forceNextSpeaker = useMutation(api.sessions.forceNextSpeaker);

  const handleAvatarClick = useCallback(
    (personaId: Id<"personas">) => {
      setOpenPopoverId((prev) => (prev === personaId ? null : personaId));
      setForceError(null);
    },
    []
  );

  const handleForceSpeak = useCallback(
    async (personaId: Id<"personas">) => {
      setForcingId(personaId);
      setForceError(null);
      try {
        await forceNextSpeaker({ sessionId, personaId });
        setOpenPopoverId(null);
      } catch (err) {
        setForceError(
          err instanceof Error ? err.message : "Failed to force speaker."
        );
      } finally {
        setForcingId(null);
      }
    },
    [forceNextSpeaker, sessionId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, personaId: Id<"personas">) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAvatarClick(personaId);
      }
      if (e.key === "Escape") {
        setOpenPopoverId(null);
      }
    },
    [handleAvatarClick]
  );

  // Close popover when clicking outside
  const handleBackdropClick = useCallback(() => {
    setOpenPopoverId(null);
    setForceError(null);
  }, []);

  return (
    <div className="w-full px-4">
      {/* Divider */}
      <div className="h-px bg-white/5 mb-6" aria-hidden="true" />

      {/* Backdrop to close popover */}
      {openPopoverId && (
        <div
          className="fixed inset-0 z-10"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Grid */}
      <div
        className="grid grid-cols-4 gap-4"
        role="list"
        aria-label="Session participants"
      >
        {personas.map((persona, index) => {
          const isSpeaking = persona._id === speakingPersonaId;
          const mood = persona.emotionalState?.mood ?? "calm";
          const moodCfg = MOOD_CONFIG[mood];
          const hasAvatar =
            persona.avatarGenerationStatus === "complete" &&
            persona.profileImageUrl;
          const initials = getInitials(persona.name);
          const isPopoverOpen = openPopoverId === persona._id;
          const isForcing = forcingId === persona._id;

          return (
            <div
              key={persona._id}
              className="relative flex flex-col items-center gap-2"
              role="listitem"
            >
              {/* Avatar button */}
              <button
                type="button"
                onClick={() => handleAvatarClick(persona._id)}
                onKeyDown={(e) => handleKeyDown(e, persona._id)}
                aria-label={`${persona.name}, ${persona.historicalRole}. Tap to see options.`}
                aria-expanded={isPopoverOpen}
                aria-haspopup="dialog"
                className={`
                  relative rounded-full p-[2px] transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                  ${isSpeaking ? "scale-105" : "hover:scale-105"}
                `}
                style={{
                  background: isSpeaking
                    ? moodCfg.ringColour
                    : "rgba(255,255,255,0.08)",
                }}
              >
                {/* Pulsing ring when speaking */}
                {isSpeaking && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-40"
                    style={{ backgroundColor: moodCfg.ringColour }}
                    aria-hidden="true"
                  />
                )}

                {/* Avatar */}
                <div
                  className={`
                    relative h-16 w-16 rounded-full overflow-hidden flex items-center justify-center
                    text-sm font-bold text-white select-none
                    ${hasAvatar ? "" : avatarBg(index)}
                  `}
                >
                  {hasAvatar ? (
                    <Image
                      src={persona.profileImageUrl!}
                      alt={persona.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span aria-hidden="true">{initials}</span>
                  )}
                </div>
              </button>

              {/* Name and role labels */}
              <div className="flex flex-col items-center gap-0.5 w-full">
                <span className="text-xs font-semibold text-white/80 text-center truncate w-full px-1">
                  {persona.name.split(" ")[0]}
                </span>
                <span className="text-[10px] text-white/60 text-center truncate w-full px-1 leading-tight">
                  {persona.historicalRole.split(" ").slice(0, 3).join(" ")}
                </span>
              </div>

              {/* Popover */}
              {isPopoverOpen && (
                <div
                  role="dialog"
                  aria-label={`Options for ${persona.name}`}
                  className={`
                    absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20
                    w-48 rounded-xl border border-white/10 bg-zinc-800/95 backdrop-blur-sm
                    shadow-xl shadow-black/40 p-3
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Persona info */}
                  <div className="mb-3 pb-2 border-b border-white/10">
                    <p className="text-xs font-semibold text-white/90 truncate">
                      {persona.name}
                    </p>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">
                      {persona.historicalRole}
                    </p>
                  </div>

                  {/* Force speak next button */}
                  <button
                    type="button"
                    onClick={() => handleForceSpeak(persona._id)}
                    disabled={isForcing}
                    className={`
                      w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium
                      text-white/80 hover:bg-white/10 hover:text-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                      transition-colors
                    `}
                    aria-label={`Force ${persona.name} to speak next`}
                  >
                    {isForcing ? (
                      <svg
                        className="h-3.5 w-3.5 animate-spin flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3.5 w-3.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {isForcing ? "Forcing…" : "Force speak next"}
                  </button>

                  {/* Error message */}
                  {forceError && openPopoverId === persona._id && (
                    <p
                      role="alert"
                      className="mt-2 text-[10px] text-red-400 px-1"
                    >
                      {forceError}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* User's own avatar */}
        {showUserAvatar && (
          <div
            className="flex flex-col items-center gap-2"
            role="listitem"
          >
            <div
              className="rounded-full p-[2px]"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/60 select-none"
                aria-label="You"
              >
                <span aria-hidden="true">You</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5 w-full">
              <span className="text-xs font-semibold text-white/80 text-center truncate w-full px-1">
                You
              </span>
              <span className="text-[10px] text-white/60 text-center truncate w-full px-1 leading-tight">
                Listener
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SessionPlayer ────────────────────────────────────────────────────────────

interface SessionPlayerProps {
  sessionId: Id<"sessions">;
}

/**
 * SessionPlayer — full-screen Twitter Spaces-style session UI.
 *
 * Composed of:
 * - Header bar with back button, scenario title, and leave button
 * - StageArea — large avatar of the currently speaking persona
 * - PersonaGrid — responsive 4-column grid of all other persona avatars
 * - ControlsBarPlaceholder — stub for task 17.2
 *
 * Requirements: 3.7, 4.2, 9.2, 9.3, 9.5, 14.7, 15.7, 17.7, 21.7, 22.4
 */
export function SessionPlayer({ sessionId }: SessionPlayerProps) {
  const router = useRouter();

  // Transcript panel state
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Ref to the transcript toggle button — focus returns here when panel closes
  const transcriptToggleRef = useRef<HTMLButtonElement>(null);

  // Connection status — tracks Convex WebSocket health (Req 10.3, 10.4)
  const { status: connectionStatus, secondsElapsed } = useConnectionStatus();

  // Fetch session data
  const session = useQuery(api.sessions.getSession, { sessionId });

  // Fetch persona states (includes emotionalState, personaName, personaRole)
  const personaStates = useQuery(api.sessions.getPersonaStates, { sessionId });

  // Fetch full persona data for the scenario (for profileImageUrl, avatarGenerationStatus)
  const scenarioId = session?.scenarioId;
  const personas = useQuery(
    api.scenarios.getPersonasForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const scenario = useQuery(
    api.scenarios.getScenarioById,
    scenarioId ? { scenarioId } : "skip"
  );

  // Subscribe to live dialogue turns for the active branch so we can snapshot
  // them into local state if the connection permanently fails (Req 10.4).
  const activeBranchId = session?.activeBranchId;
  const liveTurns = useQuery(
    api.sessions.getDialogueTurns,
    activeBranchId ? { sessionId, branchId: activeBranchId } : "skip"
  );

  // Preserved transcript — populated when connection transitions to "failed".
  // Once set, this is used instead of the live subscription so the user never
  // loses their conversation history.
  type TurnSnapshot = NonNullable<typeof liveTurns>;
  const [preservedTurns, setPreservedTurns] = useState<TurnSnapshot | null>(null);
  const prevConnectionStatus = useRef(connectionStatus);

  useEffect(() => {
    const prev = prevConnectionStatus.current;
    prevConnectionStatus.current = connectionStatus;

    // Snapshot the transcript the moment the connection transitions to "failed".
    if (prev !== "failed" && connectionStatus === "failed") {
      setPreservedTurns(liveTurns ?? []);
    }

    // If the connection recovers, clear the preserved snapshot so live data
    // resumes.
    if (connectionStatus === "connected" && preservedTurns !== null) {
      setPreservedTurns(null);
    }
  }, [connectionStatus, liveTurns, preservedTurns]);

  // ── Voice playback wiring ──────────────────────────────────────────────────
  const authToken = useAuthToken();
  const authTokenRef = useRef<string | null>(authToken);
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const requestNextTurn = useAction(api.orchestrateTurn.requestNextTurn);

  const voiceEngineRef = useRef<VoiceEngine | null>(null);
  if (voiceEngineRef.current === null && typeof window !== "undefined") {
    voiceEngineRef.current = new VoiceEngine(async () => authTokenRef.current);
  }

  const playedTurnIdsRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const [currentSpeakingPersonaId, setCurrentSpeakingPersonaId] =
    useState<Id<"personas"> | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Dispose voice engine on unmount.
  useEffect(() => {
    return () => {
      void voiceEngineRef.current?.dispose();
      voiceEngineRef.current = null;
    };
  }, []);

  // Refs for latest subscription data — keeps playback chain from reading
  // stale closures after turns/personas arrive mid-playback.
  const personasRef = useRef(personas);
  personasRef.current = personas;
  const personaStatesRef = useRef(personaStates);
  personaStatesRef.current = personaStates;
  const liveTurnsRef = useRef(liveTurns);
  liveTurnsRef.current = liveTurns;
  const sessionStatusRef = useRef(session?.status);
  sessionStatusRef.current = session?.status;

  // Effect: whenever the turn list changes, play any new turns we haven't
  // played yet. A ref guard prevents overlapping playbacks. After all queued
  // turns finish playing, trigger the next orchestrateTurn.
  useEffect(() => {
    if (!liveTurns) return;
    if (session?.status !== "active") return;
    if (!voiceEngineRef.current) return;

    const tryPlayNext = async () => {
      if (isPlayingRef.current) return;
      if (sessionStatusRef.current !== "active") return;
      const engine = voiceEngineRef.current;
      if (!engine) return;

      const turns = liveTurnsRef.current ?? [];
      const next = turns.find((t) => !playedTurnIdsRef.current.has(t._id));
      if (!next) {
        // No unplayed turns — request the next one from the orchestrator.
        if (turns.length > 0 && !isPlayingRef.current) {
          try {
            await requestNextTurn({ sessionId });
          } catch {
            // non-fatal; the UI will retry when new turns arrive
          }
        }
        return;
      }

      // Skip TTS for user turns (the user already "spoke" them).
      if (next.speakerId === "user") {
        playedTurnIdsRef.current.add(next._id);
        void tryPlayNext();
        return;
      }

      const isModerator = next.speakerId === "moderator";
      const persona = !isModerator
        ? personasRef.current?.find((p) => p._id === next.speakerId)
        : undefined;
      const voiceId = isModerator
        ? MODERATOR_VOICE_ID
        : persona?.voiceId;

      if (!voiceId) {
        // No voice id available yet (personas still loading) — wait.
        return;
      }

      const state = !isModerator
        ? personaStatesRef.current?.find((s) => s.personaId === next.speakerId)
            ?.emotionalState
        : undefined;
      const voiceParams = mapEmotionalStateToVoiceParams(
        state ?? { mood: "calm", convictionLevel: 0.7, willingnessToConcede: 0.5 }
      );

      isPlayingRef.current = true;
      playedTurnIdsRef.current.add(next._id);

      const spokenText = stripStageDirections(next.text);
      if (!spokenText) {
        isPlayingRef.current = false;
        void tryPlayNext();
        return;
      }

      await engine.playTurn(voiceId, voiceParams, spokenText, {
        onPlaybackStarted: () => {
          if (!isModerator) {
            setCurrentSpeakingPersonaId(next.speakerId as Id<"personas">);
          } else {
            setCurrentSpeakingPersonaId(null);
          }
        },
        onPlaybackComplete: () => {
          setCurrentSpeakingPersonaId(null);
        },
        onFallbackToTranscript: () => {
          setTtsError("Voice playback failed — continuing as text only.");
          setCurrentSpeakingPersonaId(null);
        },
      });

      isPlayingRef.current = false;
      // Chain to the next unplayed turn (or request a new one).
      void tryPlayNext();
    };

    void tryPlayNext();
  }, [liveTurns, session?.status, personas, personaStates, requestNextTurn, sessionId]);

  // Stop playback if the session pauses.
  useEffect(() => {
    if (session?.status !== "active") {
      voiceEngineRef.current?.stopPlayback();
      isPlayingRef.current = false;
      setCurrentSpeakingPersonaId(null);
    }
  }, [session?.status]);

  // Build merged persona list with emotional state data
  const personasWithState: PersonaWithState[] = (personas ?? []).map((persona) => {
    const state = personaStates?.find(
      (s: { personaId: Id<"personas">; emotionalState?: EmotionalState }) =>
        s.personaId === persona._id
    );
    return {
      _id: persona._id,
      name: persona.name,
      historicalRole: persona.historicalRole,
      profileImageUrl: persona.profileImageUrl,
      avatarGenerationStatus: persona.avatarGenerationStatus,
      emotionalState: state?.emotionalState,
    };
  });

  // The speaking persona (on stage)
  const speakingPersona =
    currentSpeakingPersonaId !== null
      ? personasWithState.find((p) => p._id === currentSpeakingPersonaId) ?? null
      : personasWithState[0] ?? null; // Default to first persona for display

  const speakingPersonaIndex = speakingPersona
    ? personasWithState.findIndex((p) => p._id === speakingPersona._id)
    : 0;

  // All other personas go in the grid
  const gridPersonas = personasWithState.filter(
    (p) => p._id !== speakingPersona?._id
  );

  const isPaused = session?.status === "paused";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (session === undefined || personaStates === undefined) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-zinc-950"
        role="status"
        aria-label="Loading session"
      >
        <div className="h-10 w-10 rounded-full border-4 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
        <p className="text-white/50">Session not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-purple-400 hover:text-purple-300 underline"
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* Reconnection / connection-failed banner (Req 10.3, 10.4) */}
      <ReconnectionBanner
        status={connectionStatus}
        secondsElapsed={secondsElapsed}
      />

      {/* Header bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="
            inline-flex items-center gap-1.5 text-sm font-medium text-white/60
            hover:text-white/80 focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-white/20 rounded transition-colors
          "
          aria-label="Go back"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Scenario title + REC indicator */}
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-sm font-semibold text-white/90 text-center max-w-[180px] truncate">
            {scenario?.title ?? "Loading…"}
          </h1>
          {session.status === "active" && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold text-red-400"
              aria-label="Recording in progress"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              REC
            </span>
          )}
          {session.status === "paused" && (
            <span className="text-[10px] font-semibold text-white/30">
              PAUSED
            </span>
          )}
        </div>

        <button
          onClick={() => router.push("/")}
          className="
            text-sm font-medium text-white/60 hover:text-white/80
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
            rounded transition-colors
          "
          aria-label="Leave session"
        >
          Leave
        </button>
      </header>

      {/* Main content — scrollable */}
      <main className="flex-1 overflow-y-auto">
        {/* Stage area */}
        <StageArea
          speakingPersona={speakingPersona}
          isPaused={isPaused}
          personaIndex={speakingPersonaIndex}
          voiceEngineRef={voiceEngineRef}
          isActivelySpeaking={currentSpeakingPersonaId !== null}
        />

        {/* Persona grid */}
        {personasWithState.length > 0 && (
          <PersonaGrid
            personas={gridPersonas}
            speakingPersonaId={currentSpeakingPersonaId}
            sessionId={sessionId}
            showUserAvatar
          />
        )}

        {/* Bottom padding so content isn't hidden behind controls bar */}
        <div className="h-6" aria-hidden="true" />
      </main>

      {/* Controls bar */}
      <div className="flex-shrink-0 sticky bottom-0">
        <ControlsBar
          sessionId={sessionId}
          transcriptOpen={transcriptOpen}
          onTranscriptToggle={() => {
            setTranscriptOpen((prev) => !prev);
            setUnreadCount(0);
          }}
          unreadCount={unreadCount}
          transcriptToggleRef={transcriptToggleRef}
        />
      </div>

      {/* Transcript panel — rendered as a Sheet overlay */}
      {session?.activeBranchId && (
        <TranscriptPanel
          sessionId={sessionId}
          branchId={session.activeBranchId}
          open={transcriptOpen}
          onClose={() => {
            setTranscriptOpen(false);
            // Return focus to the transcript toggle button when panel closes
            transcriptToggleRef.current?.focus();
          }}
          preservedTurns={preservedTurns ?? undefined}
        />
      )}
    </div>
  );
}
