"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { validateTopic, TOPIC_MIN_LENGTH, TOPIC_MAX_LENGTH } from "@/lib/topicValidation";
import { PersonaEditor } from "./PersonaEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "input" | "generating" | "review";

// ─── Step 1: Topic Input ──────────────────────────────────────────────────────

interface TopicInputStepProps {
  onSubmit: (topic: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

function TopicInputStep({ onSubmit, isSubmitting, error }: TopicInputStepProps) {
  const [topic, setTopic] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validation = validateTopic(topic);
  const charCount = topic.length;
  const isOverLimit = charCount > TOPIC_MAX_LENGTH;
  const isBelowMin = charCount > 0 && charCount < TOPIC_MIN_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || isSubmitting) return;
    onSubmit(topic.trim());
  };

  const charCountColour =
    isOverLimit
      ? "text-red-500"
      : charCount > TOPIC_MAX_LENGTH * 0.9
      ? "text-amber-500"
      : "text-zinc-400 dark:text-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Scenario topic input">
      <div>
        <label
          htmlFor="scenario-topic"
          className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2"
        >
          What historical topic would you like to explore?
        </label>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
          Enter any historical event, figure, movement, or era. The more specific, the richer the scenario.
        </p>
        <div className="relative">
          <textarea
            id="scenario-topic"
            ref={inputRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. The Cuban Missile Crisis, The Suffragette Movement, The Partition of India…"
            rows={4}
            maxLength={TOPIC_MAX_LENGTH + 50} // allow slight overage so user sees the error
            aria-describedby="topic-char-count topic-error"
            aria-invalid={isBelowMin || isOverLimit}
            className={`
              w-full rounded-xl border px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50
              bg-white dark:bg-zinc-900 resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors
              ${
                isBelowMin || isOverLimit
                  ? "border-red-400 dark:border-red-600"
                  : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
              }
            `}
          />
          <span
            id="topic-char-count"
            aria-live="polite"
            className={`absolute bottom-3 right-3 text-xs tabular-nums ${charCountColour}`}
          >
            {charCount}/{TOPIC_MAX_LENGTH}
          </span>
        </div>

        {/* Inline validation feedback */}
        {isBelowMin && (
          <p
            id="topic-error"
            role="alert"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            Topic must be at least {TOPIC_MIN_LENGTH} characters.
          </p>
        )}
        {isOverLimit && (
          <p
            id="topic-error"
            role="alert"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            Topic must be no more than {TOPIC_MAX_LENGTH} characters.
          </p>
        )}
      </div>

      {/* API-level error (e.g. timeout, network failure) */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          <p className="font-semibold mb-0.5">Generation failed</p>
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!validation.valid || isSubmitting}
        className="
          w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white
          hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          transition-colors
        "
        aria-label="Generate scenario"
      >
        {isSubmitting ? "Generating…" : "Generate Scenario"}
      </button>
    </form>
  );
}

// ─── Step 2: Generation Progress ─────────────────────────────────────────────

const GENERATION_MESSAGES = [
  "Researching historical context…",
  "Crafting persona backstories…",
  "Assigning voices and perspectives…",
  "Building the dialogue outline…",
  "Finalising your scenario…",
];

function GeneratingStep({ topic }: { topic: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visiblePersonaCount, setVisiblePersonaCount] = useState(0);

  // Cycle through progress messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % GENERATION_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Animate personas appearing one by one (up to 6)
  useEffect(() => {
    const interval = setInterval(() => {
      setVisiblePersonaCount((n) => (n < 6 ? n + 1 : n));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const AVATAR_BG_COLOURS = [
    "bg-rose-400", "bg-orange-400", "bg-amber-400",
    "bg-lime-500", "bg-teal-500", "bg-sky-500",
  ];

  return (
    <div
      className="flex flex-col items-center gap-8 py-6"
      role="status"
      aria-live="polite"
      aria-label="Generating scenario"
    >
      {/* Spinner */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-zinc-200 dark:border-zinc-700" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>

      {/* Topic label */}
      <div className="text-center">
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
          Generating scenario for
        </p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50 max-w-xs truncate">
          &ldquo;{topic}&rdquo;
        </p>
      </div>

      {/* Cycling progress message */}
      <p
        key={messageIndex}
        className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse text-center"
        aria-atomic="true"
      >
        {GENERATION_MESSAGES[messageIndex]}
      </p>

      {/* Personas appearing one by one */}
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-3 text-center">
          Building personas…
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`
                h-12 w-12 rounded-full flex items-center justify-center
                transition-all duration-500
                ${
                  i < visiblePersonaCount
                    ? `${AVATAR_BG_COLOURS[i]} opacity-100 scale-100`
                    : "bg-zinc-200 dark:bg-zinc-700 opacity-30 scale-75"
                }
              `}
              aria-hidden="true"
            >
              {i < visiblePersonaCount && (
                <svg
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        This may take up to 30 seconds…
      </p>
    </div>
  );
}

// ─── Step 3: Review (PersonaEditor wrapper) ───────────────────────────────────

interface ReviewStepProps {
  scenarioId: Id<"scenarios">;
  onConfirm: () => void;
  onBack: () => void;
}

function ReviewStep({ scenarioId, onConfirm, onBack }: ReviewStepProps) {
  const personas = useQuery(api.scenarios.getPersonasForScenario, { scenarioId });
  const scenario = useQuery(api.scenarios.getScenarioById, { scenarioId });

  if (personas === undefined || scenario === undefined) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading personas">
        <div className="h-8 w-8 rounded-full border-4 border-zinc-200 dark:border-zinc-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scenario summary */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
              {scenario.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {scenario.timePeriod} · {scenario.era}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
              {scenario.description}
            </p>
          </div>
        </div>
      </div>

      {/* Persona editor */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Personas ({personas.length}/6)
        </h3>
        <PersonaEditor
          scenarioId={scenarioId}
          personas={personas.map((p) => ({
            _id: p._id,
            name: p.name,
            historicalRole: p.historicalRole,
            personalityTraits: p.personalityTraits,
            emotionalBackstory: p.emotionalBackstory,
            speakingStyle: p.speakingStyle,
            ideologicalPosition: p.ideologicalPosition,
            geographicOrigin: p.geographicOrigin,
            estimatedAge: p.estimatedAge,
            gender: p.gender,
            voiceId: p.voiceId,
            profileImageUrl: p.profileImageUrl,
            portraitImageUrl: p.portraitImageUrl,
            avatarGenerationStatus: p.avatarGenerationStatus,
          }))}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onConfirm}
          className="
            flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white
            hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-blue-500 transition-colors
          "
          aria-label="Start session with this scenario"
        >
          Start Session
        </button>
        <button
          onClick={onBack}
          className="
            rounded-xl border border-zinc-300 dark:border-zinc-600 px-4 py-3
            text-sm font-medium text-zinc-700 dark:text-zinc-300
            hover:bg-zinc-50 dark:hover:bg-zinc-800
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500
            transition-colors
          "
          aria-label="Go back and generate a different scenario"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

// ─── ScenarioGenerator ────────────────────────────────────────────────────────

/**
 * ScenarioGenerator — multi-step scenario creation component.
 *
 * Step 1: Topic input with character counter and validation (Req 2.2, 2.5)
 * Step 2: Animated generation progress showing personas appearing one by one (Req 2.1)
 * Step 3: PersonaEditor review before confirming (Req 2.7)
 * Navigates to SessionSetup on completion (Req 2.1)
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export function ScenarioGenerator() {
  const router = useRouter();
  const generateScenario = useAction(api.generateScenario.generateScenario);

  const [step, setStep] = useState<Step>("input");
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScenarioId, setGeneratedScenarioId] = useState<Id<"scenarios"> | null>(null);

  const handleTopicSubmit = useCallback(
    async (submittedTopic: string) => {
      setTopic(submittedTopic);
      setError(null);
      setIsSubmitting(true);
      setStep("generating");

      try {
        const result = await generateScenario({ topic: submittedTopic });

        if (!result.success || !result.scenarioId) {
          // Generation failed — go back to input step with error (Req 2.3)
          setStep("input");
          setError(result.error ?? "Scenario generation failed. Please try again.");
          return;
        }

        setGeneratedScenarioId(result.scenarioId as Id<"scenarios">);
        setStep("review");
      } catch (err) {
        setStep("input");
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [generateScenario]
  );

  const handleConfirm = useCallback(() => {
    if (!generatedScenarioId) return;
    router.push(`/session/setup/${generatedScenarioId}`);
  }, [router, generatedScenarioId]);

  const handleStartOver = useCallback(() => {
    setStep("input");
    setTopic("");
    setError(null);
    setGeneratedScenarioId(null);
  }, []);

  // Step labels for the progress indicator
  const STEPS: { key: Step; label: string }[] = [
    { key: "input", label: "Topic" },
    { key: "generating", label: "Generating" },
    { key: "review", label: "Review" },
  ];

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="
              inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500
              hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
              transition-colors
            "
            aria-label="Back to home"
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
          <div className="flex-1">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Create Scenario
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {/* Step progress indicator */}
        <nav
          aria-label="Scenario creation steps"
          className="flex items-center gap-2 mb-8"
        >
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                  transition-colors
                  ${
                    i < currentStepIndex
                      ? "bg-blue-600 text-white"
                      : i === currentStepIndex
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                  }
                `}
                aria-current={i === currentStepIndex ? "step" : undefined}
              >
                {i < currentStepIndex ? (
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  i === currentStepIndex
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    i < currentStepIndex
                      ? "bg-blue-600"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </nav>

        {/* Step content */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          {step === "input" && (
            <TopicInputStep
              onSubmit={handleTopicSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}
          {step === "generating" && <GeneratingStep topic={topic} />}
          {step === "review" && generatedScenarioId && (
            <ReviewStep
              scenarioId={generatedScenarioId}
              onConfirm={handleConfirm}
              onBack={handleStartOver}
            />
          )}
        </div>
      </main>
    </div>
  );
}
