"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonaData {
  _id: Id<"personas">;
  name: string;
  historicalRole: string;
  personalityTraits: string[];
  emotionalBackstory: string;
  speakingStyle: string;
  ideologicalPosition: string;
  geographicOrigin: string;
  estimatedAge: number;
  gender: string;
  voiceId: string;
  profileImageUrl?: string | null;
  portraitImageUrl?: string | null;
  avatarGenerationStatus: "pending" | "complete" | "failed";
}

interface PersonaEditorProps {
  scenarioId: Id<"scenarios">;
  personas: PersonaData[];
  /** Called when personas are updated (add/edit/delete) */
  onPersonasChange?: () => void;
}

const MAX_PERSONAS = 6;
const MIN_PERSONAS = 2;

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_BG_COLOURS = [
  "bg-rose-400", "bg-orange-400", "bg-amber-400",
  "bg-lime-500", "bg-teal-500", "bg-sky-500",
  "bg-violet-500", "bg-pink-500",
];

function avatarBg(index: number): string {
  return AVATAR_BG_COLOURS[index % AVATAR_BG_COLOURS.length];
}

// ─── PersonaAvatar ────────────────────────────────────────────────────────────

function PersonaAvatar({
  persona,
  index,
  size = "md",
}: {
  persona: PersonaData;
  index: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";

  if (persona.avatarGenerationStatus === "pending") {
    return (
      <div
        className={`${sizeClass} rounded-full ${avatarBg(index)} flex items-center justify-center`}
        aria-label={`${persona.name} avatar loading`}
      >
        <svg
          className="animate-spin h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (persona.avatarGenerationStatus === "complete" && persona.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={persona.profileImageUrl}
        alt={persona.name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  // Fallback: initials
  return (
    <div
      className={`${sizeClass} rounded-full ${avatarBg(index)} flex items-center justify-center font-bold text-white`}
      aria-label={`${persona.name} initials avatar`}
    >
      {getInitials(persona.name)}
    </div>
  );
}

// ─── PersonaCard ──────────────────────────────────────────────────────────────

interface PersonaCardProps {
  persona: PersonaData;
  index: number;
  canDelete: boolean;
  onEdit: (persona: PersonaData) => void;
  onDelete: (personaId: Id<"personas">) => void;
}

function PersonaCard({ persona, index, canDelete, onEdit, onDelete }: PersonaCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const personalitySummary = persona.personalityTraits.slice(0, 3).join(", ");

  return (
    <article
      className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex items-start gap-4"
      aria-label={`Persona: ${persona.name}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <PersonaAvatar persona={persona} index={index} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
              {persona.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {persona.historicalRole}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(persona)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              aria-label={`Edit ${persona.name}`}
            >
              Edit
            </button>
            {canDelete && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-medium text-red-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                aria-label={`Delete ${persona.name}`}
              >
                ✕
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500">Delete?</span>
                <button
                  onClick={() => {
                    onDelete(persona._id);
                    setShowDeleteConfirm(false);
                  }}
                  className="text-xs font-medium text-red-600 hover:underline"
                  aria-label={`Confirm delete ${persona.name}`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs font-medium text-zinc-500 hover:underline"
                  aria-label="Cancel delete"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {personalitySummary && (
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-2">
            &ldquo;{personalitySummary}&rdquo;
          </p>
        )}
      </div>
    </article>
  );
}

// ─── PersonaEditForm ──────────────────────────────────────────────────────────

interface PersonaEditFormProps {
  persona: PersonaData;
  onSave: (updates: Partial<PersonaData>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function PersonaEditForm({ persona, onSave, onCancel, isSaving }: PersonaEditFormProps) {
  const [name, setName] = useState(persona.name);
  const [historicalRole, setHistoricalRole] = useState(persona.historicalRole);
  const [personalityTraits, setPersonalityTraits] = useState(
    persona.personalityTraits.join(", ")
  );
  const [emotionalBackstory, setEmotionalBackstory] = useState(persona.emotionalBackstory);
  const [speakingStyle, setSpeakingStyle] = useState(persona.speakingStyle);
  const [ideologicalPosition, setIdeologicalPosition] = useState(persona.ideologicalPosition);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      historicalRole: historicalRole.trim(),
      personalityTraits: personalityTraits.split(",").map((t) => t.trim()).filter(Boolean),
      emotionalBackstory: emotionalBackstory.trim(),
      speakingStyle: speakingStyle.trim(),
      ideologicalPosition: ideologicalPosition.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3"
      aria-label={`Edit persona: ${persona.name}`}
    >
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
        Editing: {persona.name}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Historical Role
          </label>
          <input
            type="text"
            value={historicalRole}
            onChange={(e) => setHistoricalRole(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Personality Traits (comma-separated)
        </label>
        <input
          type="text"
          value={personalityTraits}
          onChange={(e) => setPersonalityTraits(e.target.value)}
          placeholder="e.g. brave, idealistic, conflicted"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Emotional Backstory
        </label>
        <textarea
          value={emotionalBackstory}
          onChange={(e) => setEmotionalBackstory(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Speaking Style
          </label>
          <input
            type="text"
            value={speakingStyle}
            onChange={(e) => setSpeakingStyle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Ideological Position
          </label>
          <input
            type="text"
            value={ideologicalPosition}
            onChange={(e) => setIdeologicalPosition(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── PersonaEditor ────────────────────────────────────────────────────────────

/**
 * PersonaEditor component.
 *
 * Renders each persona as an expandable card with avatar, name, role, and
 * personality summary. Supports edit, delete, and add actions.
 * Enforces 6-persona maximum with warning.
 *
 * Requirements: 2.7, 22.4, 22.5
 */
export function PersonaEditor({
  scenarioId,
  personas,
  onPersonasChange,
}: PersonaEditorProps) {
  const [editingPersonaId, setEditingPersonaId] = useState<Id<"personas"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePersonaMutation = useMutation(api.scenarios.updatePersona);
  const deletePersonaMutation = useMutation(api.scenarios.deletePersona);
  const addPersonaMutation = useMutation(api.scenarios.addPersona);

  const atMaxPersonas = personas.length >= MAX_PERSONAS;
  const canDelete = personas.length > MIN_PERSONAS;

  const handleEdit = useCallback((persona: PersonaData) => {
    setEditingPersonaId(persona._id);
    setError(null);
  }, []);

  const handleSave = useCallback(
    async (personaId: Id<"personas">, updates: Partial<PersonaData>) => {
      setIsSaving(true);
      setError(null);
      try {
        await updatePersonaMutation({
          personaId,
          name: updates.name,
          historicalRole: updates.historicalRole,
          personalityTraits: updates.personalityTraits,
          emotionalBackstory: updates.emotionalBackstory,
          speakingStyle: updates.speakingStyle,
          ideologicalPosition: updates.ideologicalPosition,
        });
        setEditingPersonaId(null);
        onPersonasChange?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save persona.");
      } finally {
        setIsSaving(false);
      }
    },
    [updatePersonaMutation, onPersonasChange]
  );

  const handleDelete = useCallback(
    async (personaId: Id<"personas">) => {
      setError(null);
      try {
        await deletePersonaMutation({ personaId });
        onPersonasChange?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete persona.");
      }
    },
    [deletePersonaMutation, onPersonasChange]
  );

  const handleAddPersona = useCallback(async () => {
    if (atMaxPersonas) return;
    setError(null);
    try {
      await addPersonaMutation({
        scenarioId,
        name: "New Persona",
        historicalRole: "Historical Figure",
        personalityTraits: ["curious", "determined", "thoughtful"],
        emotionalBackstory:
          "This persona has a rich emotional history connected to the events of this scenario. Their experiences have shaped their worldview and how they engage with others.",
        speakingStyle: "Formal and measured",
        ideologicalPosition: "Neutral observer",
        geographicOrigin: "Unknown",
        estimatedAge: 35,
        gender: "neutral",
        voiceId: "pNInz6obpgDQGcFmaJgB",
      });
      onPersonasChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add persona.");
    }
  }, [atMaxPersonas, addPersonaMutation, scenarioId, onPersonasChange]);

  return (
    <div className="space-y-3" aria-label="Persona editor">
      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Persona list */}
      <div className="space-y-2">
        {personas.map((persona, index) =>
          editingPersonaId === persona._id ? (
            <PersonaEditForm
              key={persona._id}
              persona={persona}
              onSave={(updates) => handleSave(persona._id, updates)}
              onCancel={() => setEditingPersonaId(null)}
              isSaving={isSaving}
            />
          ) : (
            <PersonaCard
              key={persona._id}
              persona={persona}
              index={index}
              canDelete={canDelete}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )
        )}
      </div>

      {/* Add persona button */}
      <div className="pt-1">
        {atMaxPersonas ? (
          <p
            role="status"
            className="text-sm text-amber-600 dark:text-amber-400 font-medium"
            aria-live="polite"
          >
            ⚠ Maximum of {MAX_PERSONAS} personas reached. Delete a persona to add a new one.
          </p>
        ) : (
          <button
            onClick={handleAddPersona}
            className="
              inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300
              dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400
              hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              transition-colors w-full justify-center
            "
            aria-label="Add a new persona"
          >
            <span aria-hidden="true">+</span>
            Add Persona
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ({personas.length}/{MAX_PERSONAS})
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
