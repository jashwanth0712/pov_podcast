"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SessionSettingsSheet } from "./SessionSettingsSheet";
import { ParticipantsSheet } from "./ParticipantsSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlsBarProps {
  sessionId: Id<"sessions">;
  /** Whether the transcript panel is currently open. */
  transcriptOpen: boolean;
  /** Toggle the transcript panel open/closed. */
  onTranscriptToggle: () => void;
  /** Unread message count for the transcript badge. */
  unreadCount?: number;
  /** Auth token for voice input (passed to TranscriptPanel). */
  authToken?: string;
  /** Ref forwarded to the transcript toggle button for focus management. */
  transcriptToggleRef?: React.RefObject<HTMLButtonElement | null>;
}

// ─── MicIcon ──────────────────────────────────────────────────────────────────

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 01-14 0v-2"
      />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// ─── PeopleIcon ───────────────────────────────────────────────────────────────

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

// ─── SettingsIcon ─────────────────────────────────────────────────────────────

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ─── ChatIcon ─────────────────────────────────────────────────────────────────

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

// ─── ControlsBar ─────────────────────────────────────────────────────────────

/**
 * ControlsBar — fixed bottom bar with:
 * - Push-to-talk (PTT) microphone button (opens transcript panel for voice input)
 * - Participants button (opens ParticipantsSheet)
 * - Settings button (opens SessionSettingsSheet)
 * - Transcript/chat toggle button with unread badge
 *
 * Requirements: 14.5, 14.6, 14.7, 17.4, 18.4, 20.4
 */
export function ControlsBar({
  sessionId,
  transcriptOpen,
  onTranscriptToggle,
  unreadCount = 0,
  authToken,
  transcriptToggleRef,
}: ControlsBarProps) {
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // PTT mic state — opens transcript panel for voice input
  const [isPTTActive, setIsPTTActive] = useState(false);
  const pttTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePTTPress = useCallback(() => {
    setIsPTTActive(true);
    // Open transcript panel so user can see the voice input UI
    if (!transcriptOpen) {
      onTranscriptToggle();
    }
  }, [transcriptOpen, onTranscriptToggle]);

  const handlePTTRelease = useCallback(() => {
    setIsPTTActive(false);
    if (pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
    }
  }, []);

  // Keyboard support for PTT: Space/Enter activates, releasing the key deactivates
  const handlePTTKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !isPTTActive) {
        e.preventDefault();
        handlePTTPress();
      }
    },
    [isPTTActive, handlePTTPress]
  );

  const handlePTTKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handlePTTRelease();
      }
    },
    [handlePTTRelease]
  );

  return (
    <>
      {/* Controls bar */}
      <div
        className="flex items-center justify-around px-6 py-4 border-t border-white/5 bg-zinc-900/90 backdrop-blur-sm"
        role="toolbar"
        aria-label="Session controls"
      >
        {/* PTT Microphone button */}
        <button
          type="button"
          onPointerDown={handlePTTPress}
          onPointerUp={handlePTTRelease}
          onPointerLeave={handlePTTRelease}
          onKeyDown={handlePTTKeyDown}
          onKeyUp={handlePTTKeyUp}
          className={`
            flex flex-col items-center gap-1 transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-lg p-1
            ${
              isPTTActive
                ? "text-red-400 scale-110"
                : "text-white/70 hover:text-white/90"
            }
          `}
          aria-label={isPTTActive ? "Recording — release to submit" : "Hold to speak (push-to-talk)"}
          aria-pressed={isPTTActive}
        >
          <div
            className={`
              relative h-10 w-10 rounded-full flex items-center justify-center
              transition-all duration-150
              ${
                isPTTActive
                  ? "bg-red-500/20 border border-red-500/50"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }
            `}
          >
            {isPTTActive && (
              <span
                className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
                aria-hidden="true"
              />
            )}
            <MicIcon className="h-5 w-5 relative z-10" />
          </div>
          <span className="text-[10px] font-medium">
            {isPTTActive ? "Recording" : "Request"}
          </span>
        </button>

        {/* Participants button */}
        <button
          type="button"
          onClick={() => setParticipantsOpen(true)}
          className="
            flex flex-col items-center gap-1 text-white/70 hover:text-white/90
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-lg p-1
            transition-colors
          "
          aria-label="Open participants list"
          aria-haspopup="dialog"
        >
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-colors">
            <PeopleIcon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">People</span>
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="
            flex flex-col items-center gap-1 text-white/70 hover:text-white/90
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-lg p-1
            transition-colors
          "
          aria-label="Open session settings"
          aria-haspopup="dialog"
        >
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-colors">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Settings</span>
        </button>

        {/* Transcript/chat toggle */}
        <button
          ref={transcriptToggleRef}
          type="button"
          onClick={onTranscriptToggle}
          className={`
            flex flex-col items-center gap-1
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-lg p-1
            transition-colors
            ${transcriptOpen ? "text-purple-400" : "text-white/70 hover:text-white/90"}
          `}
          aria-label={transcriptOpen ? "Close transcript" : "Open transcript"}
          aria-pressed={transcriptOpen}
          aria-haspopup="dialog"
        >
          <div
            className={`
              relative h-10 w-10 rounded-full flex items-center justify-center
              border transition-colors
              ${
                transcriptOpen
                  ? "bg-purple-500/20 border-purple-500/40"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }
            `}
          >
            <ChatIcon className="h-5 w-5" />
            {/* Unread badge */}
            {unreadCount > 0 && !transcriptOpen && (
              <span
                className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">
            {transcriptOpen ? "Close" : "Chat"}
          </span>
        </button>
      </div>

      {/* Participants sheet */}
      <ParticipantsSheet
        sessionId={sessionId}
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
      />

      {/* Session settings sheet */}
      <SessionSettingsSheet
        sessionId={sessionId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
