"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { transcribeSpeech, stripStageDirections } from "../../lib/voiceEngine";
import { Sheet } from "../ui/Sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

type MicState =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "transcribing"
  | "denied"
  | "error";

interface TranscriptPanelProps {
  sessionId: Id<"sessions">;
  branchId: Id<"branches">;
  /** Whether the bottom sheet is open. */
  open: boolean;
  /** Called when the sheet should close. */
  onClose: () => void;
  /** Called when the user submits a message from the input bar. */
  onSubmitInterruption?: (text: string) => void | Promise<void>;
  /** Convex auth token — required for voice input. */
  authToken?: string;
  /**
   * When provided, this snapshot is displayed instead of the live Convex
   * subscription. Used to preserve the transcript after a connection failure
   * (Req 10.4).
   */
  preservedTurns?: DialogueTurn[];
}

/** Minimal shape of a dialogue turn as returned by getDialogueTurns. */
interface DialogueTurn {
  _id: Id<"dialogueTurns">;
  speakerId: Id<"personas"> | "user" | "moderator";
  speakerName: string;
  text: string;
  timestamp: number;
  isUserInterruption: boolean;
  qualityWarning: boolean;
  articleReferences: Array<{
    url: string;
    title: string;
    isVerified: boolean;
    isIllustrative: boolean;
    ideologicalAlignment: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns initials from a speaker name (up to 2 chars). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Formats a Unix timestamp as a relative time string. */
function formatTimestamp(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Colour palette for avatar backgrounds (cycles by index). */
const AVATAR_COLOURS = [
  "bg-purple-500/30 text-purple-300",
  "bg-blue-500/30 text-blue-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-amber-500/30 text-amber-300",
  "bg-rose-500/30 text-rose-300",
  "bg-cyan-500/30 text-cyan-300",
];

// ─── TranscriptPanel ──────────────────────────────────────────────────────────

/**
 * TranscriptPanel — unified transcript + chat panel rendered as a bottom sheet.
 *
 * Renders all dialogue turns for the given branch with:
 * - Avatar (initials fallback), speaker name + role + timestamp, text
 * - Inline citation chips with visible bias label
 * - Branch fork dividers when a turn has isUserInterruption: true
 * - Scrollable transcript area
 * - Text input bar (1–1000 chars) with submit button
 * - PTT mic button for voice input
 *
 * Requirements: 4.3, 5.9, 9.1, 13.3, 13.4, 13.5, 13.6, 18.2, 18.3
 */
export function TranscriptPanel({
  sessionId,
  branchId,
  open,
  onClose,
  onSubmitInterruption,
  authToken,
  preservedTurns,
}: TranscriptPanelProps) {
  const liveTurns = useQuery(api.sessions.getDialogueTurns, { sessionId, branchId });

  // Use preserved snapshot when available (connection failed), otherwise live data.
  const turns = preservedTurns ?? liveTurns;

  // Fetch persona states to get roles
  const personaStates = useQuery(api.sessions.getPersonaStates, { sessionId });

  // Build a map from personaName → personaRole
  const personaRoleMap: Record<string, string> = {};
  if (personaStates) {
    for (const state of personaStates) {
      if (state.personaName && state.personaRole) {
        personaRoleMap[state.personaName] = state.personaRole;
      }
    }
  }

  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // ── Voice / mic state ──────────────────────────────────────────────────────
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new turns arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  // ── Mic button handler ─────────────────────────────────────────────────────

  const handleMicClick = async () => {
    // If already recording, stop and transcribe
    if (micState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }

    // Retry from error state — reset to idle first
    if (micState === "error") {
      setMicState("idle");
      setMicError(null);
    }

    // Start recording flow
    setMicState("requesting-permission");
    setMicError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "";
      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError"
      ) {
        setMicState("denied");
        setMicError(
          "Microphone access denied. Please enable it in your browser settings."
        );
      } else {
        setMicState("error");
        setMicError(
          err instanceof Error
            ? `Microphone error: ${err.message}`
            : "Could not access microphone. Please try again."
        );
      }
      return;
    }

    // Permission granted — start recording
    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      // Stop all tracks to release the microphone
      stream.getTracks().forEach((t) => t.stop());

      setMicState("transcribing");

      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      audioChunksRef.current = [];

      try {
        const text = await transcribeSpeech(audioBlob, authToken ?? "");
        setInputText(text);
        setMicState("idle");
        setMicError(null);
      } catch (err) {
        setMicState("error");
        setMicError(
          "Transcription failed. Please try again or type your message."
        );
        console.error("Transcription error:", err);
      }
    };

    recorder.start();
    setMicState("recording");
  };

  // ── Mic button aria-label ──────────────────────────────────────────────────

  function getMicAriaLabel(): string {
    switch (micState) {
      case "idle":
        return authToken ? "Start voice input" : "Sign in to use voice input";
      case "requesting-permission":
        return "Requesting microphone permission\u2026";
      case "recording":
        return "Stop recording";
      case "transcribing":
        return "Transcribing\u2026";
      case "denied":
        return "Microphone access denied";
      case "error":
        return "Voice input error \u2014 click to retry";
    }
  }

  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setInputError("Message cannot be empty.");
      return;
    }
    if (trimmed.length > 1000) {
      setInputError("Message must be 1–1000 characters.");
      return;
    }

    setInputError(null);
    setIsSubmitting(true);

    try {
      await onSubmitInterruption?.(trimmed);
      setInputText("");
    } catch {
      setInputError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Input bar (rendered as Sheet footer) ──────────────────────────────────

  const inputBar = (
    <div>
      {inputError && (
        <p role="alert" className="text-xs text-red-400 mb-2">
          {inputError}
        </p>
      )}

      {/* Mic error / denied message */}
      {micError && (
        <p
          role="alert"
          aria-live="polite"
          className="text-xs text-amber-400 mb-2"
        >
          {micError}
        </p>
      )}

      <div className="flex items-end gap-2">
        {/* Push-to-talk mic button */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={
            !authToken ||
            micState === "requesting-permission" ||
            micState === "transcribing" ||
            micState === "denied"
          }
          title={!authToken ? "Sign in to use voice input" : undefined}
          aria-label={getMicAriaLabel()}
          className={`
            flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center
            border transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
            disabled:opacity-40 disabled:cursor-not-allowed
            ${
              micState === "recording"
                ? "border-red-500/60 bg-red-500/20 text-red-400 animate-pulse"
                : micState === "denied"
                ? "border-white/10 bg-white/5 text-white/30"
                : micState === "error"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
            }
          `}
        >
          {micState === "requesting-permission" || micState === "transcribing" ? (
            /* Spinner */
            <svg
              className="h-4 w-4 animate-spin"
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
          ) : micState === "denied" ? (
            /* Mic-off icon */
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : micState === "recording" ? (
            /* Red pulsing dot */
            <span
              className="h-3 w-3 rounded-full bg-red-500"
              aria-hidden="true"
            />
          ) : (
            /* Mic icon */
            <svg
              className="h-4 w-4"
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
          )}
        </button>

        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          maxLength={1000}
          disabled={isSubmitting}
          className="
            flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2
            text-sm text-white/90 placeholder-white/40
            focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Type a message to interrupt the conversation"
          aria-describedby={inputError ? "input-error" : undefined}
        />

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !inputText.trim()}
          className="
            flex-shrink-0 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white
            hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
            transition-all duration-150
          "
          aria-label={isSubmitting ? "Sending\u2026" : "Send message"}
        >
          {isSubmitting ? (
            <svg
              className="h-4 w-4 animate-spin"
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
            "Send"
          )}
        </button>
      </div>

      {/* Recording indicator (aria-live for screen readers) */}
      {micState === "recording" && (
        <p
          aria-live="polite"
          className="text-xs text-red-400 mt-1 flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          Recording… click the mic button to stop
        </p>
      )}

      {/* Character count */}
      {inputText.length > 800 && (
        <p
          className={`text-xs mt-1 text-right ${inputText.length > 1000 ? "text-red-400" : "text-white/30"}`}
          aria-live="polite"
        >
          {inputText.length}/1000
        </p>
      )}
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  const transcriptContent =
    turns === undefined ? (
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-label="Loading transcript"
      >
        <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    ) : (
      <div
        ref={scrollRef}
        className="flex flex-col gap-4"
        role="log"
        aria-label="Conversation transcript"
        aria-live="polite"
      >
        {turns.length === 0 && (
          <p className="text-center text-sm text-white/60 py-8">
            The conversation will appear here.
          </p>
        )}

        {turns.map((turn, index) => {
          const isUser = turn.speakerId === "user";
          const isModerator = turn.speakerId === "moderator";
          const colourClass = AVATAR_COLOURS[index % AVATAR_COLOURS.length];
          const initials = getInitials(turn.speakerName);

          // Determine speaker role
          let speakerRole: string;
          if (isUser) {
            speakerRole = "You";
          } else if (isModerator) {
            speakerRole = "Moderator";
          } else {
            speakerRole = personaRoleMap[turn.speakerName] ?? "";
          }

          return (
            <div key={turn._id}>
              {/* Branch fork divider — shown above user interruption turns */}
              {turn.isUserInterruption && (
                <div
                  className="flex items-center gap-3 my-3"
                  role="separator"
                  aria-label="Branch fork point"
                >
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30 font-medium whitespace-nowrap">
                    ── Branch fork ──
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              {/* Turn entry */}
              <div
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                aria-label={`${turn.speakerName}: ${stripStageDirections(turn.text)}`}
              >
                {/* Avatar */}
                <div
                  className={`
                    flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                    text-xs font-bold select-none
                    ${isUser ? "bg-white/10 text-white/60" : isModerator ? "bg-zinc-700 text-white/50" : colourClass}
                  `}
                  aria-hidden="true"
                >
                  {initials}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {/* Speaker name + role + timestamp */}
                  <div className={`flex items-baseline gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-xs font-semibold text-white/80">
                      {turn.speakerName}
                    </span>
                    {speakerRole && speakerRole !== turn.speakerName && (
                      <span className="text-[10px] text-white/60 leading-tight">
                        {speakerRole}
                      </span>
                    )}
                    <span className="text-xs text-white/50">
                      {formatTimestamp(turn.timestamp)}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`
                      rounded-2xl px-3 py-2 text-sm leading-relaxed max-w-[85%]
                      ${
                        isUser
                          ? "bg-purple-500/20 text-white/90 rounded-tr-sm"
                          : "bg-white/5 text-white/90 rounded-tl-sm"
                      }
                      ${turn.qualityWarning ? "border border-amber-500/30" : ""}
                    `}
                  >
                    {stripStageDirections(turn.text)}

                    {/* Quality warning indicator */}
                    {turn.qualityWarning && (
                      <span
                        className="ml-2 text-xs text-amber-400/70"
                        title="This turn was generated with reduced quality"
                        aria-label="Quality warning"
                      >
                        ⚠
                      </span>
                    )}
                  </div>

                  {/* Inline citation chips + visible bias label */}
                  {turn.articleReferences.length > 0 && (
                    <div>
                      <div
                        className="flex flex-wrap gap-1.5 mt-1"
                        aria-label={`Citations from ${turn.speakerName}`}
                      >
                        {turn.articleReferences.map((ref, refIndex) => (
                          <a
                            key={refIndex}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              inline-flex items-center gap-1 rounded-full border border-white/10
                              bg-white/5 px-2 py-0.5 text-xs text-white/70 hover:text-white/90
                              hover:bg-white/10 hover:border-white/20 transition-colors
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                            "
                            aria-label={`Citation: ${ref.title} — cited by ${turn.speakerName}, reflects their perspective`}
                          >
                            <span aria-hidden="true">📎</span>
                            <span className="max-w-[120px] truncate">{ref.title}</span>
                            {!ref.isVerified && (
                              <span className="text-amber-400/60" aria-label="Unverified source">
                                ?
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                      {/* Visible bias label — Req 13.5, 13.6 */}
                      <p className="text-[10px] text-white/50 mt-1 italic">
                        Cited by {turn.speakerName} — reflects their perspective
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <Sheet open={open} onClose={onClose} title="Transcript" footer={inputBar}>
      {transcriptContent}
    </Sheet>
  );
}
