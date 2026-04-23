"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet } from "../../components/ui/Sheet";
import { ConversationTree } from "./ConversationTree";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionSettingsSheetProps {
  sessionId: Id<"sessions">;
  open: boolean;
  onClose: () => void;
}

type TabId = "settings" | "tree" | "relationships" | "sources";

const TABS: { id: TabId; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "tree", label: "Conversation" },
  { id: "relationships", label: "Relationships" },
  { id: "sources", label: "Sources" },
];

// ─── Relationship type config ─────────────────────────────────────────────────

type RelationshipType =
  | "alliance"
  | "rivalry"
  | "mentor_student"
  | "ideological_kinship"
  | "historical_enmity";

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  alliance: "Alliance",
  rivalry: "Rivalry",
  mentor_student: "Mentor / Student",
  ideological_kinship: "Ideological Kinship",
  historical_enmity: "Historical Enmity",
};

const RELATIONSHIP_COLOURS: Record<RelationshipType, string> = {
  alliance: "text-emerald-400",
  rivalry: "text-red-400",
  mentor_student: "text-blue-400",
  ideological_kinship: "text-violet-400",
  historical_enmity: "text-orange-400",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center py-10"
      role="status"
      aria-label={label}
    >
      <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
    </div>
  );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────

interface SettingsTabProps {
  sessionId: Id<"sessions">;
}

function SettingsTab({ sessionId }: SettingsTabProps) {
  const session = useQuery(api.sessions.getSession, { sessionId });

  const switchTurnTakingMode = useMutation(api.sessions.switchTurnTakingMode);
  const updateDepthLevel = useMutation(api.sessions.updateDepthLevel);
  const triggerModerator = useMutation(api.orchestrateTurn.triggerModerator);

  const [switchingMode, setSwitchingMode] = useState(false);
  const [switchingDepth, setSwitchingDepth] = useState(false);
  const [triggeringModerator, setTriggeringModerator] = useState(false);
  const [moderatorSuccess, setModeratorSuccess] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [depthError, setDepthError] = useState<string | null>(null);
  const [moderatorError, setModeratorError] = useState<string | null>(null);

  const handleSwitchMode = useCallback(
    async (mode: "Relevance" | "RoundRobin" | "Random") => {
      if (!session || session.turnTakingMode === mode) return;
      setSwitchingMode(true);
      setModeError(null);
      try {
        await switchTurnTakingMode({ sessionId, mode });
      } catch (err) {
        setModeError(
          err instanceof Error ? err.message : "Failed to switch turn-taking mode."
        );
      } finally {
        setSwitchingMode(false);
      }
    },
    [session, sessionId, switchTurnTakingMode]
  );

  const handleSwitchDepth = useCallback(
    async (depthLevel: "Casual" | "Intermediate" | "Scholar") => {
      if (!session || session.depthLevel === depthLevel) return;
      setSwitchingDepth(true);
      setDepthError(null);
      try {
        await updateDepthLevel({ sessionId, depthLevel });
      } catch (err) {
        setDepthError(
          err instanceof Error ? err.message : "Failed to update depth level."
        );
      } finally {
        setSwitchingDepth(false);
      }
    },
    [session, sessionId, updateDepthLevel]
  );

  const handleTriggerModerator = useCallback(async () => {
    if (!session?.activeBranchId) return;
    setTriggeringModerator(true);
    setModeratorError(null);
    setModeratorSuccess(false);
    try {
      await triggerModerator({
        sessionId,
        branchId: session.activeBranchId,
      });
      setModeratorSuccess(true);
      setTimeout(() => setModeratorSuccess(false), 3000);
    } catch (err) {
      setModeratorError(
        err instanceof Error ? err.message : "Failed to trigger moderator."
      );
    } finally {
      setTriggeringModerator(false);
    }
  }, [session, sessionId, triggerModerator]);

  if (session === undefined) {
    return <Spinner label="Loading settings" />;
  }

  if (session === null) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Session not found.
      </p>
    );
  }

  const isActive = session.status === "active";

  const turnModes: { value: "Relevance" | "RoundRobin" | "Random"; label: string }[] = [
    { value: "Relevance", label: "Relevance" },
    { value: "RoundRobin", label: "Round Robin" },
    { value: "Random", label: "Random" },
  ];

  const depthLevels: { value: "Casual" | "Intermediate" | "Scholar"; label: string }[] = [
    { value: "Casual", label: "Casual" },
    { value: "Intermediate", label: "Intermediate" },
    { value: "Scholar", label: "Scholar" },
  ];

  return (
    <div className="space-y-6">
      {/* Turn-taking mode */}
      <section aria-labelledby="turn-taking-heading">
        <h3
          id="turn-taking-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40"
        >
          Turn-Taking Mode
        </h3>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Turn-taking mode selector"
        >
          {turnModes.map(({ value, label }) => {
            const isActive_ = session.turnTakingMode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSwitchMode(value)}
                disabled={switchingMode}
                aria-pressed={isActive_}
                aria-label={`Turn-taking mode: ${label}`}
                className={`
                  flex-1 rounded-xl border px-3 py-2 text-xs font-medium
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isActive_
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
                  }
                `}
              >
                {switchingMode && isActive_ ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      className="h-3 w-3 animate-spin"
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
                    {label}
                  </span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
        {modeError && (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {modeError}
          </p>
        )}
      </section>

      {/* Depth level */}
      <section aria-labelledby="depth-level-heading">
        <h3
          id="depth-level-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40"
        >
          Depth Level
        </h3>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Depth level selector"
        >
          {depthLevels.map(({ value, label }) => {
            const isActive_ = session.depthLevel === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSwitchDepth(value)}
                disabled={switchingDepth}
                aria-pressed={isActive_}
                aria-label={`Depth level: ${label}`}
                className={`
                  flex-1 rounded-xl border px-3 py-2 text-xs font-medium
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isActive_
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
                  }
                `}
              >
                {switchingDepth && isActive_ ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      className="h-3 w-3 animate-spin"
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
                    {label}
                  </span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
        {depthError && (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {depthError}
          </p>
        )}
      </section>

      {/* Moderator trigger */}
      <section aria-labelledby="moderator-heading">
        <h3
          id="moderator-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40"
        >
          Moderator
        </h3>
        <button
          type="button"
          onClick={handleTriggerModerator}
          disabled={triggeringModerator || !isActive}
          aria-label="Trigger moderator to speak next"
          className={`
            w-full rounded-xl border px-4 py-3 text-sm font-medium
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              moderatorSuccess
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90"
            }
          `}
        >
          {triggeringModerator ? (
            <span className="flex items-center justify-center gap-2">
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
              Triggering…
            </span>
          ) : moderatorSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <span aria-hidden="true">✓</span>
              Moderator will speak next
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span aria-hidden="true">🎙️</span>
              Trigger Moderator
            </span>
          )}
        </button>
        {!isActive && (
          <p className="mt-2 text-xs text-white/30 text-center">
            Session must be active to trigger moderator.
          </p>
        )}
        {moderatorError && (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {moderatorError}
          </p>
        )}
      </section>
    </div>
  );
}

// ─── RelationshipMapTab ───────────────────────────────────────────────────────

interface RelationshipMapTabProps {
  sessionId: Id<"sessions">;
}

function RelationshipMapTab({ sessionId }: RelationshipMapTabProps) {
  const session = useQuery(api.sessions.getSession, { sessionId });
  const scenarioId = session?.scenarioId;

  const relationships = useQuery(
    api.personaRelationships.getRelationshipsForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const personas = useQuery(
    api.scenarios.getPersonasForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const isLoading =
    session === undefined || relationships === undefined || personas === undefined;

  if (isLoading) {
    return <Spinner label="Loading relationship map" />;
  }

  if (!relationships || relationships.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        No relationships defined for this scenario.
      </p>
    );
  }

  const personaMap = new Map(
    (personas ?? []).map((p) => [p._id as string, p.name])
  );

  return (
    <ul role="list" className="space-y-3" aria-label="Persona relationships">
      {relationships.map((rel) => {
        const nameA = personaMap.get(rel.personaAId as string) ?? "Unknown";
        const nameB = personaMap.get(rel.personaBId as string) ?? "Unknown";
        const type = rel.relationshipType as RelationshipType;
        const typeLabel = RELATIONSHIP_LABELS[type] ?? rel.relationshipType;
        const typeColour = RELATIONSHIP_COLOURS[type] ?? "text-white/60";

        return (
          <li
            key={`${rel.personaAId}-${rel.personaBId}`}
            role="listitem"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-1"
          >
            {/* Persona names */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white/90">{nameA}</span>
              <span className="text-white/30 text-sm" aria-hidden="true">↔</span>
              <span className="text-sm font-semibold text-white/90">{nameB}</span>
            </div>

            {/* Relationship type */}
            <p className={`text-xs font-medium ${typeColour}`}>{typeLabel}</p>

            {/* Description */}
            {rel.description && (
              <p className="text-xs text-white/50 leading-relaxed">{rel.description}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── SourceMapTab ─────────────────────────────────────────────────────────────

interface ArticleRef {
  url: string;
  title: string;
  isVerified?: boolean;
  isIllustrative?: boolean;
}

interface SourceMapTabProps {
  sessionId: Id<"sessions">;
}

function SourceMapTab({ sessionId }: SourceMapTabProps) {
  const session = useQuery(api.sessions.getSession, { sessionId });
  const activeBranchId = session?.activeBranchId;

  const turns = useQuery(
    api.sessions.getDialogueTurns,
    activeBranchId ? { sessionId, branchId: activeBranchId } : "skip"
  );

  const isLoading = session === undefined || turns === undefined;

  if (isLoading) {
    return <Spinner label="Loading source map" />;
  }

  if (!turns || turns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        No sources cited yet.
      </p>
    );
  }

  // Collect all article references, deduplicate by URL, group by speakerName
  const grouped = new Map<string, { refs: Map<string, ArticleRef> }>();

  for (const turn of turns) {
    if (!turn.articleReferences || turn.articleReferences.length === 0) continue;
    const speaker = turn.speakerName ?? "Unknown";

    if (!grouped.has(speaker)) {
      grouped.set(speaker, { refs: new Map() });
    }

    const group = grouped.get(speaker)!;
    for (const ref of turn.articleReferences) {
      if (!group.refs.has(ref.url)) {
        group.refs.set(ref.url, {
          url: ref.url,
          title: ref.title ?? ref.url,
          isVerified: ref.isVerified,
          isIllustrative: ref.isIllustrative,
        });
      }
    }
  }

  if (grouped.size === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        No sources cited yet.
      </p>
    );
  }

  return (
    <div className="space-y-5" aria-label="Source map grouped by persona">
      {Array.from(grouped.entries()).map(([speakerName, { refs }]) => (
        <section key={speakerName} aria-labelledby={`source-speaker-${speakerName}`}>
          {/* Persona section header */}
          <h4
            id={`source-speaker-${speakerName}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40"
          >
            {speakerName}
          </h4>

          {/* Article chips */}
          <div className="flex flex-wrap gap-2">
            {Array.from(refs.values()).map((ref) => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${ref.title}${ref.isVerified === false ? " (unverified)" : ""} — opens in new tab`}
                className="
                  inline-flex items-center gap-1.5 rounded-lg border border-white/10
                  bg-white/5 px-3 py-1.5 text-xs text-white/70
                  hover:bg-white/10 hover:text-white/90 hover:border-white/20
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                  transition-all duration-150 max-w-[200px]
                "
              >
                <span className="truncate">{ref.title}</span>
                {ref.isVerified === false && (
                  <span
                    className="flex-shrink-0 text-amber-400"
                    aria-label="Unverified source"
                    title="Unverified source"
                  >
                    ⚠
                  </span>
                )}
                <svg
                  className="h-3 w-3 flex-shrink-0 text-white/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── SessionSettingsSheet ─────────────────────────────────────────────────────

/**
 * SessionSettingsSheet — bottom sheet with tabs for Settings, Conversation Tree,
 * Relationship Map, and Source Map.
 *
 * Requirements: 14.5, 14.6, 14.7, 17.4, 18.4, 20.4
 */
export function SessionSettingsSheet({
  sessionId,
  open,
  onClose,
}: SessionSettingsSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("settings");

  return (
    <Sheet open={open} onClose={onClose} title="Session Settings">
      {/* Tab bar */}
      <div
        className="flex gap-1 mb-5 border-b border-white/10 -mx-6 px-6"
        role="tablist"
        aria-label="Settings tabs"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                ${
                  isActive
                    ? "text-purple-400 border-purple-400"
                    : "text-white/40 border-transparent hover:text-white/60"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "settings" && <SettingsTab sessionId={sessionId} />}
        {activeTab === "tree" && <ConversationTree sessionId={sessionId} />}
        {activeTab === "relationships" && (
          <RelationshipMapTab sessionId={sessionId} />
        )}
        {activeTab === "sources" && <SourceMapTab sessionId={sessionId} />}
      </div>
    </Sheet>
  );
}
