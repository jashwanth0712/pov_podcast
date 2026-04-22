"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet } from "../ui/Sheet";
import { PersonaCard } from "./PersonaCard";

interface ScenarioDetailSheetProps {
  scenarioId: Id<"scenarios"> | null;
  onClose: () => void;
}

const ERA_COLOURS: Record<string, string> = {
  Ancient: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  Medieval: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  Modern: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  Contemporary: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

interface PersonaEditData {
  name: string;
  historicalRole: string;
  emotionalBackstory: string;
  personalityTraits: string[];
}

function PersonaFormPanel({
  persona,
  onSave,
  onCancel,
  mode = "edit",
}: {
  persona?: { _id: Id<"personas">; name: string; historicalRole: string; emotionalBackstory: string; personalityTraits: string[] };
  onSave: (data: PersonaEditData) => void;
  onCancel: () => void;
  mode?: "edit" | "add";
}) {
  const [name, setName] = useState(persona?.name ?? "");
  const [role, setRole] = useState(persona?.historicalRole ?? "");
  const [backstory, setBackstory] = useState(persona?.emotionalBackstory ?? "");
  const [traits, setTraits] = useState(persona?.personalityTraits.join(", ") ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      historicalRole: role,
      emotionalBackstory: backstory,
      personalityTraits: traits.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  const isAdd = mode === "add";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isAdd ? "bg-purple-500/20" : "bg-white/10"}`}>
            {isAdd ? (
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {isAdd ? "Add Persona" : "Edit Persona"}
          </h3>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marie Curie"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Historical Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Physicist and Chemist"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Traits (comma-separated)</label>
          <input
            type="text"
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            placeholder="e.g., Curious, Determined, Resilient"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Backstory</label>
          <textarea
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
            rows={3}
            placeholder="A brief emotional backstory..."
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 bg-white hover:bg-white/90 text-zinc-900 font-semibold rounded-xl text-sm transition-colors"
          >
            {isAdd ? "Add Persona" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ScenarioDetailSheet({ scenarioId, onClose }: ScenarioDetailSheetProps) {
  const router = useRouter();
  const [editingPersonaId, setEditingPersonaId] = useState<Id<"personas"> | null>(null);
  const [isAddingPersona, setIsAddingPersona] = useState(false);

  const scenario = useQuery(
    api.scenarios.getScenarioById,
    scenarioId ? { scenarioId } : "skip"
  );

  const personas = useQuery(
    api.scenarios.getPersonasForScenario,
    scenarioId ? { scenarioId } : "skip"
  );

  const deletePersona = useMutation(api.scenarios.deletePersona);
  const updatePersona = useMutation(api.scenarios.updatePersona);
  const addPersona = useMutation(api.scenarios.addPersona);

  const handleStartSession = () => {
    if (scenarioId) {
      router.push(`/session/setup/${scenarioId}`);
    }
  };

  const handleEditPersona = useCallback((personaId: Id<"personas">) => {
    setEditingPersonaId(personaId);
  }, []);

  const handleDeletePersona = useCallback(async (personaId: Id<"personas">) => {
    if (confirm("Are you sure you want to delete this persona?")) {
      await deletePersona({ personaId });
    }
  }, [deletePersona]);

  const handleCloseEditor = useCallback(() => {
    setEditingPersonaId(null);
  }, []);

  const handleSavePersona = useCallback(async (data: PersonaEditData) => {
    if (!editingPersonaId) return;
    await updatePersona({
      personaId: editingPersonaId,
      name: data.name,
      historicalRole: data.historicalRole,
      emotionalBackstory: data.emotionalBackstory,
      personalityTraits: data.personalityTraits,
    });
    setEditingPersonaId(null);
  }, [editingPersonaId, updatePersona]);

  const handleAddPersona = useCallback(async (data: PersonaEditData) => {
    if (!scenarioId) return;
    await addPersona({
      scenarioId,
      name: data.name,
      historicalRole: data.historicalRole,
      emotionalBackstory: data.emotionalBackstory,
      personalityTraits: data.personalityTraits,
      speakingStyle: "Formal",
      ideologicalPosition: "Neutral",
      geographicOrigin: "Unknown",
      estimatedAge: 30,
      gender: "Unknown",
      voiceId: "default",
    });
    setIsAddingPersona(false);
  }, [scenarioId, addPersona]);

  const isLoading = scenario === undefined || personas === undefined;
  const editingPersona = personas?.find((p) => p._id === editingPersonaId);

  return (
    <Sheet
      open={scenarioId !== null}
      onClose={onClose}
      title={scenario?.title ?? "Loading..."}
      footer={
        <button
          onClick={handleStartSession}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-white hover:bg-white/90 disabled:bg-white/50 text-zinc-900 font-semibold rounded-xl transition-all duration-200 shadow-lg"
        >
          Start Session
        </button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : scenario ? (
        <div className="space-y-6">
          {/* Banner Image */}
          {scenario.bannerImageUrl && (
            <div className="relative -mx-6 -mt-6 h-48 overflow-hidden rounded-t-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scenario.bannerImageUrl}
                alt={scenario.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}

          {/* Era & Time Period */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${ERA_COLOURS[scenario.era] ?? "bg-zinc-700 text-zinc-300"}`}>
              {scenario.era}
            </span>
            <span className="text-sm text-white/50">
              {scenario.timePeriod}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-white/70">
            {scenario.description}
          </p>

          {/* Personas */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Personas
              <span className="text-white/40 font-normal">({personas?.length ?? 0})</span>
            </h3>
            <div className="space-y-3">
              {personas?.map((persona, index) => (
                <PersonaCard
                  key={persona._id}
                  id={persona._id}
                  name={persona.name}
                  historicalRole={persona.historicalRole}
                  personalityTraits={persona.personalityTraits}
                  emotionalBackstory={persona.emotionalBackstory}
                  profileImageUrl={persona.profileImageUrl}
                  avatarGenerationStatus={persona.avatarGenerationStatus}
                  index={index}
                  onEdit={handleEditPersona}
                  onDelete={handleDeletePersona}
                />
              ))}

              {/* Add Persona Button */}
              <button
                onClick={() => setIsAddingPersona(true)}
                className="
                  w-full rounded-2xl p-4 border border-dashed border-white/10
                  bg-white/[0.02] hover:bg-white/5 hover:border-white/20
                  transition-all duration-300 ease-out
                  flex items-center justify-center gap-2
                  text-white/40 hover:text-white/70
                  group
                "
              >
                <span className="h-6 w-6 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                <span className="text-sm font-medium">Add Persona</span>
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] leading-tight text-white/30 border-t border-white/5 pt-3">
            Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.
          </p>
        </div>
      ) : (
        <p className="text-zinc-500">Scenario not found.</p>
      )}

      {/* Edit Persona Panel */}
      {editingPersona && (
        <PersonaFormPanel
          persona={editingPersona}
          onSave={handleSavePersona}
          onCancel={handleCloseEditor}
          mode="edit"
        />
      )}

      {/* Add Persona Panel */}
      {isAddingPersona && (
        <PersonaFormPanel
          onSave={handleAddPersona}
          onCancel={() => setIsAddingPersona(false)}
          mode="add"
        />
      )}
    </Sheet>
  );
}
