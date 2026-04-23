"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptPanelProps {
  sessionId: Id<"sessions">;
  branchId: Id<"branches">;
  /** Called when the user submits a message from the input bar. */
  onSubmitInterruption?: (text: string) => void | Promise<void>;
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
 * TranscriptPanel — unified transcript + chat panel.
 *
 * Renders all dialogue turns for the given branch with:
 * - Avatar (initials fallback), speaker name + role + timestamp, text
 * - Inline citation chips
 * - Branch fork dividers when a turn has isUserInterruption: true
 * - Scrollable transcript area
 * - Text input bar (1–1000 chars) with submit button
 *
 * Requirements: 4.3, 5.9, 9.1, 16.5
 */
export function TranscriptPanel({
  sessionId,
  branchId,
  onSubmitInterruption,
}: TranscriptPanelProps) {
  const turns = useQuery(api.sessions.getDialogueTurns, { sessionId, branchId });

  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new turns arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (turns === undefined) {
    return (
      <div
        className="flex flex-col h-full bg-zinc-900"
        role="status"
        aria-label="Loading transcript"
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900" aria-label="Transcript panel">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-white/70">Transcript</h2>
      </div>

      {/* Scrollable transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
        role="log"
        aria-label="Conversation transcript"
        aria-live="polite"
      >
        {turns.length === 0 && (
          <p className="text-center text-sm text-white/30 py-8">
            The conversation will appear here.
          </p>
        )}

        {turns.map((turn, index) => {
          const isUser = turn.speakerId === "user";
          const isModerator = turn.speakerId === "moderator";
          const colourClass = AVATAR_COLOURS[index % AVATAR_COLOURS.length];
          const initials = getInitials(turn.speakerName);

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
                aria-label={`${turn.speakerName}: ${turn.text}`}
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
                  {/* Speaker name + timestamp */}
                  <div className={`flex items-baseline gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-xs font-semibold text-white/70">
                      {turn.speakerName}
                    </span>
                    {isModerator && (
                      <span className="text-xs text-white/30">Moderator</span>
                    )}
                    <span className="text-xs text-white/30">
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
                          : "bg-white/5 text-white/80 rounded-tl-sm"
                      }
                      ${turn.qualityWarning ? "border border-amber-500/30" : ""}
                    `}
                  >
                    {turn.text}

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

                  {/* Inline citation chips */}
                  {turn.articleReferences.length > 0 && (
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
                            bg-white/5 px-2 py-0.5 text-xs text-white/50 hover:text-white/70
                            hover:bg-white/10 hover:border-white/20 transition-colors
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                          "
                          aria-label={`Citation: ${ref.title} — cited by ${turn.speakerName}, reflects their perspective`}
                          title={`Cited by ${turn.speakerName} — reflects their perspective`}
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
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-white/5 px-4 py-3">
        {inputError && (
          <p
            role="alert"
            className="text-xs text-red-400 mb-2"
          >
            {inputError}
          </p>
        )}

        <div className="flex items-end gap-2">
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
              text-sm text-white/80 placeholder-white/30
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
            aria-label={isSubmitting ? "Sending…" : "Send message"}
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
    </div>
  );
}
