"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet } from "../../components/ui/Sheet";
import { ConversationTree } from "./ConversationTree";
import { AmbientAudioControls } from "./AmbientAudioControls";

// ─── Ambient audio props ──────────────────────────────────────────────────────

export interface AmbientControlsState {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  onMusicVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  status?: {
    musicUrlPresent: boolean;
    sfxCount: number;
    musicBufferLoaded: boolean;
    audioContextState: string;
    graph?: {
      masterGain: number;
      muteGain: number;
      musicGain: number;
      musicSourceActive: boolean;
      ducked: boolean;
    };
  };
  onTestTone?: () => void;
  musicUrlForElement?: string | null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionSettingsSheetProps {
  sessionId: Id<"sessions">;
  open: boolean;
  onClose: () => void;
  ambientControls?: AmbientControlsState;
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
  ambientControls?: AmbientControlsState;
}

function SettingsTab({ sessionId, ambientControls }: SettingsTabProps) {
  const session = useQuery(api.sessions.getSession, { sessionId });

  const switchTurnTakingMode = useMutation(api.sessions.switchTurnTakingMode);
  const updateDepthLevel = useMutation(api.sessions.updateDepthLevel);
  const triggerModerator = useMutation(api.orchestrateMutations.triggerModerator);

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
      {/* Ambient audio controls (Req 3.1, 5.1–5.5) — rendered first so users
          immediately see the music/sfx controls. */}
      {ambientControls && (
        <AmbientAudioControls
          musicVolume={ambientControls.musicVolume}
          sfxVolume={ambientControls.sfxVolume}
          isMuted={ambientControls.isMuted}
          onMusicVolumeChange={ambientControls.onMusicVolumeChange}
          onSfxVolumeChange={ambientControls.onSfxVolumeChange}
          onMuteToggle={ambientControls.onMuteToggle}
          status={ambientControls.status}
          onTestTone={ambientControls.onTestTone}
          musicUrlForElement={ambientControls.musicUrlForElement}
        />
      )}

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

// ─── Relationship map SVG colours (hex, for SVG stroke/fill) ─────────────────

const RELATIONSHIP_SVG_COLOURS: Record<RelationshipType, string> = {
  alliance: "#34d399",         // emerald-400
  rivalry: "#f87171",          // red-400
  mentor_student: "#60a5fa",   // blue-400
  ideological_kinship: "#a78bfa", // violet-400
  historical_enmity: "#fb923c",   // orange-400
};

// Avatar background colours for nodes (cycling palette)
const NODE_BG_COLOURS = [
  "#7c3aed", // violet-700
  "#1d4ed8", // blue-700
  "#0f766e", // teal-700
  "#b45309", // amber-700
  "#be185d", // pink-700
  "#15803d", // green-700
];

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

  const personaList = personas ?? [];
  const personaMap = new Map(
    personaList.map((p) => [p._id as string, p.name])
  );

  // ── SVG circular layout ───────────────────────────────────────────────────
  const SVG_SIZE = 320;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 110;
  const NODE_R = 22; // node circle radius

  const nodeCount = personaList.length;

  // Compute (x, y) for each persona node
  const nodePositions = personaList.map((p, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2; // start at top
    return {
      id: p._id as string,
      name: p.name,
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
      colour: NODE_BG_COLOURS[i % NODE_BG_COLOURS.length],
      initials: p.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join(""),
    };
  });

  const posMap = new Map(nodePositions.map((n) => [n.id, n]));

  return (
    <div className="space-y-5">
      {/* SVG graph — Req 20.4 */}
      <div
        className="flex justify-center"
        role="img"
        aria-label="Persona relationship graph"
      >
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          aria-label="Relationship map showing personas as nodes connected by labelled edges"
          className="overflow-visible"
        >
          {/* Edges */}
          {relationships.map((rel) => {
            const nodeA = posMap.get(rel.personaAId as string);
            const nodeB = posMap.get(rel.personaBId as string);
            if (!nodeA || !nodeB) return null;

            const type = rel.relationshipType as RelationshipType;
            const colour = RELATIONSHIP_SVG_COLOURS[type] ?? "#ffffff";
            const label = RELATIONSHIP_LABELS[type] ?? rel.relationshipType;

            // Midpoint for label
            const mx = (nodeA.x + nodeB.x) / 2;
            const my = (nodeA.y + nodeB.y) / 2;

            // Unique id for this edge (for aria)
            const edgeId = `edge-${rel.personaAId}-${rel.personaBId}`;

            return (
              <g key={edgeId} aria-label={`${nodeA.name} and ${nodeB.name}: ${label}`}>
                <line
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke={colour}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                {/* Edge label background */}
                <rect
                  x={mx - 30}
                  y={my - 8}
                  width={60}
                  height={14}
                  rx={3}
                  fill="#0f0f1a"
                  fillOpacity={0.85}
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill={colour}
                  fontFamily="sans-serif"
                  aria-hidden="true"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodePositions.map((node) => (
            <g key={node.id} aria-label={node.name}>
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_R}
                fill={node.colour}
                fillOpacity={0.85}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill="white"
                fontFamily="sans-serif"
                aria-hidden="true"
              >
                {node.initials}
              </text>
              {/* Name label below node */}
              <text
                x={node.x}
                y={node.y + NODE_R + 12}
                textAnchor="middle"
                fontSize={8}
                fill="rgba(255,255,255,0.6)"
                fontFamily="sans-serif"
                aria-hidden="true"
              >
                {node.name.split(" ")[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend / detail list */}
      <ul role="list" className="space-y-3" aria-label="Persona relationships detail">
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
    </div>
  );
}

// ─── SourceMapTab ─────────────────────────────────────────────────────────────

interface ArticleRef {
  url: string;
  title: string;
  isVerified?: boolean;
  isIllustrative?: boolean;
  ideologicalAlignment?: string;
}

interface SpeakerGroup {
  speakerName: string;
  speakerId: Id<"personas"> | "user" | "moderator";
  refs: Map<string, ArticleRef>;
}

interface SelectedSource {
  speakerName: string;
  speakerId: Id<"personas"> | "user" | "moderator";
  url: string;
  title: string;
}

interface ExplanationState {
  status: "idle" | "loading" | "loaded" | "error";
  text: string | null;
  error: string | null;
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

  const generateExplanation = useAction(
    api.generateCitationExplanation.generateCitationExplanation
  );

  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(null);
  const [explanationState, setExplanationState] = useState<ExplanationState>({
    status: "idle",
    text: null,
    error: null,
  });

  const isLoading = session === undefined || turns === undefined;

  const handleSourceClick = useCallback(
    async (
      speakerName: string,
      speakerId: Id<"personas"> | "user" | "moderator",
      url: string,
      title: string
    ) => {
      // Toggle off if same source is clicked again
      if (selectedSource?.url === url && selectedSource?.speakerName === speakerName) {
        setSelectedSource(null);
        setExplanationState({ status: "idle", text: null, error: null });
        return;
      }

      setSelectedSource({ speakerName, speakerId, url, title });

      // Only generate explanation for persona speakers (not user/moderator)
      if (speakerId === "user" || speakerId === "moderator") {
        setExplanationState({ status: "idle", text: null, error: null });
        return;
      }

      setExplanationState({ status: "loading", text: null, error: null });

      try {
        const result = await generateExplanation({
          sessionId,
          personaId: speakerId,
          articleUrl: url,
          articleTitle: title,
        });
        setExplanationState({
          status: "loaded",
          text: result.explanation,
          error: null,
        });
      } catch (err) {
        setExplanationState({
          status: "error",
          text: null,
          error:
            err instanceof Error
              ? err.message
              : "Failed to generate explanation.",
        });
      }
    },
    [selectedSource, generateExplanation, sessionId]
  );

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
  // Also track speakerId so we can call generateCitationExplanation
  const grouped = new Map<string, SpeakerGroup>();

  for (const turn of turns) {
    if (!turn.articleReferences || turn.articleReferences.length === 0) continue;
    const speaker = turn.speakerName ?? "Unknown";
    const speakerId = turn.speakerId as Id<"personas"> | "user" | "moderator";

    if (!grouped.has(speaker)) {
      grouped.set(speaker, {
        speakerName: speaker,
        speakerId,
        refs: new Map(),
      });
    }

    const group = grouped.get(speaker)!;
    for (const ref of turn.articleReferences) {
      if (!group.refs.has(ref.url)) {
        group.refs.set(ref.url, {
          url: ref.url,
          title: ref.title ?? ref.url,
          isVerified: ref.isVerified,
          isIllustrative: ref.isIllustrative,
          ideologicalAlignment: ref.ideologicalAlignment,
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
      {Array.from(grouped.entries()).map(([speakerName, group]) => (
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
            {Array.from(group.refs.values()).map((ref) => {
              const isSelected =
                selectedSource?.url === ref.url &&
                selectedSource?.speakerName === speakerName;

              return (
                <div key={ref.url} className="w-full">
                  {/* Chip row */}
                  <div className="flex items-start gap-2 flex-wrap">
                    {/* Clickable chip for explanation */}
                    <button
                      type="button"
                      onClick={() =>
                        handleSourceClick(
                          speakerName,
                          group.speakerId,
                          ref.url,
                          ref.title ?? ref.url
                        )
                      }
                      aria-expanded={isSelected}
                      aria-label={`${ref.title}${ref.isVerified === false ? " (unverified)" : ""} — click to see why ${speakerName} cited this`}
                      className={`
                        inline-flex items-center gap-1.5 rounded-lg border
                        px-3 py-1.5 text-xs
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                        transition-all duration-150 max-w-[220px]
                        ${
                          isSelected
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90 hover:border-white/20"
                        }
                      `}
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
                      {ref.isIllustrative && (
                        <span
                          className="flex-shrink-0 text-blue-400 text-[10px]"
                          aria-label="Illustrative source"
                          title="Illustrative source"
                        >
                          ✦
                        </span>
                      )}
                    </button>

                    {/* External link */}
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${ref.title} in new tab`}
                      className="
                        inline-flex items-center justify-center rounded-lg border border-white/10
                        bg-white/5 p-1.5
                        hover:bg-white/10 hover:border-white/20
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                        transition-all duration-150 flex-shrink-0
                      "
                    >
                      <svg
                        className="h-3 w-3 text-white/40"
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
                  </div>

                  {/* Ideological alignment annotation — Req 18.4 */}
                  {ref.ideologicalAlignment && (
                    <p className="mt-0.5 ml-1 text-[10px] text-white/35 leading-tight">
                      {ref.ideologicalAlignment}
                    </p>
                  )}

                  {/* Expanded explanation panel — Req 18.5 */}
                  {isSelected && (
                    <div
                      className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2.5"
                      role="region"
                      aria-label={`${speakerName}'s explanation for citing ${ref.title}`}
                      aria-live="polite"
                    >
                      {explanationState.status === "loading" && (
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin flex-shrink-0" />
                          <span className="text-xs text-white/40">
                            {speakerName} is explaining…
                          </span>
                        </div>
                      )}

                      {explanationState.status === "loaded" &&
                        explanationState.text && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/70">
                              {speakerName} explains:
                            </p>
                            <p className="text-xs text-white/70 leading-relaxed">
                              {explanationState.text}
                            </p>
                          </div>
                        )}

                      {explanationState.status === "error" && (
                        <p className="text-xs text-red-400" role="alert">
                          {explanationState.error}
                        </p>
                      )}

                      {/* For user/moderator speakers, no AI explanation available */}
                      {explanationState.status === "idle" &&
                        (group.speakerId === "user" ||
                          group.speakerId === "moderator") && (
                          <p className="text-xs text-white/40 italic">
                            No persona explanation available for this speaker.
                          </p>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
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
  ambientControls,
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
        {activeTab === "settings" && (
          <SettingsTab sessionId={sessionId} ambientControls={ambientControls} />
        )}
        {activeTab === "tree" && <ConversationTree sessionId={sessionId} />}
        {activeTab === "relationships" && (
          <RelationshipMapTab sessionId={sessionId} />
        )}
        {activeTab === "sources" && <SourceMapTab sessionId={sessionId} />}
      </div>
    </Sheet>
  );
}
