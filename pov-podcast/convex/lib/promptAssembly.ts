/**
 * Persona system prompt assembly.
 *
 * Builds the system prompt for a Persona Agent encoding:
 * - Name, historical role, ≥3 personality traits
 * - Emotional backstory (≥200 words)
 * - Speaking style, ideological position
 * - ≥3 article references
 * - All pairwise relationship descriptors
 * - Depth level modifier (Casual / Intermediate / Scholar)
 * - Emotional state modifier (mood, conviction, willingness to concede)
 * - Relationship tone modifier when preceding turn is from a related persona
 *
 * Requirements: 3.4, 3.5, 15.1, 19.3, 20.2, 20.5, 21.4, 21.9
 */

export type DepthLevel = "Casual" | "Intermediate" | "Scholar";
export type Mood = "calm" | "frustrated" | "passionate" | "defensive" | "resigned";
export type RelationshipType =
  | "alliance"
  | "rivalry"
  | "mentor_student"
  | "ideological_kinship"
  | "historical_enmity";

export interface ArticleReference {
  url: string;
  title: string;
  isVerified: boolean;
  isIllustrative: boolean;
  ideologicalAlignment: string;
}

export interface EmotionalState {
  mood: Mood;
  convictionLevel: number;       // 0.0–1.0
  willingnessToConcede: number;  // 0.0–1.0
}

export interface PersonaRelationship {
  otherPersonaName: string;
  relationshipType: RelationshipType;
  description: string;
}

export interface PersonaPromptInput {
  name: string;
  historicalRole: string;
  personalityTraits: string[];       // min 3
  emotionalBackstory: string;        // min 200 words
  speakingStyle: string;
  ideologicalPosition: string;
  articleReferences: ArticleReference[];  // min 3
  relationships: PersonaRelationship[];
}

export interface PromptContext {
  depthLevel: DepthLevel;
  emotionalState: EmotionalState;
  /** Name of the persona who spoke the preceding turn, if any */
  precedingSpeakerName?: string;
  /** Relationship between this persona and the preceding speaker, if any */
  precedingRelationship?: PersonaRelationship;
}

// ─── Depth level instructions ─────────────────────────────────────────────────

const DEPTH_LEVEL_INSTRUCTIONS: Record<DepthLevel, string> = {
  Casual: `DEPTH LEVEL: CASUAL
Speak in accessible, emotionally direct language. Avoid academic jargon or dense historical references.
Focus on personal feelings, vivid storytelling, and relatable human experiences.
Your vocabulary should be conversational — as if speaking to a curious friend, not a scholar.
Keep sentences relatively short and punchy. Prioritise emotional resonance over analytical depth.`,

  Intermediate: `DEPTH LEVEL: INTERMEDIATE
Balance emotional storytelling with historical context and analytical commentary.
You may reference specific events, dates, and figures, but always ground them in personal experience.
Use moderately complex vocabulary. Offer some analytical observations about causes and consequences.
Aim for the register of an informed documentary narrator who is also a participant.`,

  Scholar: `DEPTH LEVEL: SCHOLAR
Engage in deep ideological and historiographical analysis. Reference specific primary sources,
historiographical debates, and theoretical frameworks where relevant.
Use precise, dense vocabulary appropriate to academic discourse.
Challenge assumptions, cite evidence, and engage with the ideological underpinnings of events.
Your language should reflect the complexity of someone who has studied this period exhaustively.`,
};

// ─── Emotional state instructions ─────────────────────────────────────────────

function buildEmotionalStateInstruction(state: EmotionalState): string {
  const moodDescriptions: Record<Mood, string> = {
    calm: "You are currently calm and measured. Speak with composure, though your convictions remain firm.",
    frustrated:
      "You are currently frustrated. Your words carry an edge of irritation. You may interrupt yourself, repeat key points with emphasis, or express exasperation at being misunderstood.",
    passionate:
      "You are currently passionate and energised. Your language is vivid and urgent. You lean into your beliefs with intensity and may speak faster, with more rhetorical flourish.",
    defensive:
      "You are currently defensive. You feel your position is under attack. Guard your arguments carefully, push back against challenges, and be wary of conceding ground.",
    resigned:
      "You are currently resigned. A sense of weariness or inevitability colours your words. You may speak more slowly, with a subdued intensity, as if the weight of events has settled on you.",
  };

  const convictionDesc =
    state.convictionLevel >= 0.8
      ? "Your conviction in your position is extremely strong — you are unlikely to yield."
      : state.convictionLevel >= 0.5
      ? "You hold your position with moderate conviction — you can be moved by compelling arguments."
      : "Your conviction is wavering — you are genuinely open to reconsidering your stance.";

  const concedeDesc =
    state.willingnessToConcede >= 0.7
      ? "You are quite willing to acknowledge valid points made by others, even if they challenge you."
      : state.willingnessToConcede >= 0.4
      ? "You will concede minor points if pressed, but guard your core position."
      : "You are resistant to conceding anything — every challenge hardens your resolve.";

  return `CURRENT EMOTIONAL STATE:
${moodDescriptions[state.mood]}
${convictionDesc}
${concedeDesc}

IMPORTANT: Your depth level governs vocabulary complexity and analytical density.
Your emotional state governs tone, intensity, and language register.
Both apply simultaneously and neither overrides the other.`;
}

// ─── Relationship tone modifier ───────────────────────────────────────────────

function buildRelationshipToneModifier(
  precedingSpeakerName: string,
  relationship: PersonaRelationship
): string {
  const toneInstructions: Record<RelationshipType, string> = {
    alliance: `The previous speaker, ${precedingSpeakerName}, is your ally. When responding, your tone should be warm and supportive, even if you disagree on specifics. You share common ground and should acknowledge it.`,
    rivalry: `The previous speaker, ${precedingSpeakerName}, is your rival. Your rebuttal should be sharper and more pointed than it would be with a neutral peer. You may challenge their framing directly and with some heat.`,
    mentor_student: `The previous speaker, ${precedingSpeakerName}, is in a mentor/student relationship with you. Adjust your tone to reflect that dynamic — either with the authority of a mentor or the deference (and occasional pushback) of a student.`,
    ideological_kinship: `The previous speaker, ${precedingSpeakerName}, shares your ideological kinship. Engage with their point from a place of shared values, building on their argument or refining it rather than opposing it.`,
    historical_enmity: `The previous speaker, ${precedingSpeakerName}, is someone with whom you share historical enmity. Your response carries the weight of that history. You may be cold, cutting, or deeply emotional — but the enmity should be palpable.`,
  };

  return `RELATIONSHIP TONE MODIFIER:
${toneInstructions[relationship.relationshipType]}
Context: ${relationship.description}`;
}

// ─── Relationship catalogue ───────────────────────────────────────────────────

function buildRelationshipsSection(relationships: PersonaRelationship[]): string {
  if (relationships.length === 0) return "";

  const lines = relationships.map(
    (r) =>
      `- ${r.otherPersonaName}: ${r.relationshipType.replace("_", "/")} — ${r.description}`
  );

  return `YOUR RELATIONSHIPS WITH OTHER PARTICIPANTS:
${lines.join("\n")}

When addressing these individuals directly, let your relationship type shape your tone and word choice.`;
}

// ─── Article references section ───────────────────────────────────────────────

function buildArticleReferencesSection(refs: ArticleReference[]): string {
  if (refs.length === 0) return "";

  const lines = refs.map((r) => {
    const verifiedNote = r.isVerified ? "" : " [unverified URL]";
    const illustrativeNote = r.isIllustrative ? " [illustrative — not a verified historical source]" : "";
    return `- "${r.title}" (${r.url})${verifiedNote}${illustrativeNote} — ${r.ideologicalAlignment}`;
  });

  return `YOUR SOURCE MATERIAL:
You have access to the following article references that inform your perspective.
When relevant, cite them naturally in conversation to support your arguments.
${lines.join("\n")}`;
}

// ─── Core system prompt builder ───────────────────────────────────────────────

/**
 * Assembles the full system prompt for a Persona Agent.
 *
 * Requirements: 3.4, 3.5, 15.1, 19.3, 20.2, 20.5, 21.4, 21.9
 */
export function assemblePersonaSystemPrompt(
  persona: PersonaPromptInput,
  context: PromptContext
): string {
  const sections: string[] = [];

  // ── Identity ──────────────────────────────────────────────────────────────
  sections.push(`You are ${persona.name}, ${persona.historicalRole}.

PERSONALITY TRAITS:
${persona.personalityTraits.map((t) => `- ${t}`).join("\n")}

EMOTIONAL BACKSTORY:
${persona.emotionalBackstory}

SPEAKING STYLE:
${persona.speakingStyle}

IDEOLOGICAL POSITION:
${persona.ideologicalPosition}`);

  // ── Relationships ─────────────────────────────────────────────────────────
  const relationshipsSection = buildRelationshipsSection(persona.relationships);
  if (relationshipsSection) {
    sections.push(relationshipsSection);
  }

  // ── Article references ────────────────────────────────────────────────────
  const refsSection = buildArticleReferencesSection(persona.articleReferences);
  if (refsSection) {
    sections.push(refsSection);
  }

  // ── Expressiveness instruction (Req 15.1) ─────────────────────────────────
  sections.push(`EXPRESSIVENESS REQUIREMENT:
Every response you generate MUST contain at least one of the following:
1. An emotional statement (expressing how you feel about what was said or what is happening)
2. A reference to a personal struggle or lived experience from your backstory
3. An ideological assertion (a clear statement of your beliefs, values, or political position)

Do NOT generate neutral, detached, or purely factual responses. You are a living person with
strong feelings and convictions. Let them show in every turn.`);

  // ── Depth level modifier (Req 19.3) ──────────────────────────────────────
  sections.push(DEPTH_LEVEL_INSTRUCTIONS[context.depthLevel]);

  // ── Emotional state modifier (Req 21.4, 21.9) ────────────────────────────
  sections.push(buildEmotionalStateInstruction(context.emotionalState));

  // ── Relationship tone modifier (Req 20.5) ────────────────────────────────
  if (context.precedingSpeakerName && context.precedingRelationship) {
    sections.push(
      buildRelationshipToneModifier(
        context.precedingSpeakerName,
        context.precedingRelationship
      )
    );
  }

  // ── Conversation rules ────────────────────────────────────────────────────
  sections.push(`CONVERSATION RULES:
- Stay fully in character at all times. Never break the fourth wall.
- Respond to what was actually said in the conversation — do not ignore other speakers.
- Keep your response to 2–3 sentences (roughly 30–70 words). This is a spoken
  back-and-forth conversation, not a monologue — leave room for others to speak.
- Do not summarise the conversation or repeat what others have said verbatim.
- If you cite a source, do so naturally within your speech, not as a footnote.
- You are speaking aloud in a conversation, not writing an essay.

DELIVERY FORMAT (IMPORTANT — for text-to-speech via ElevenLabs v3):
- Output spoken words only. Do NOT write stage directions or body-movement
  descriptions such as "*shifts uncomfortably*", "*touches neck*", "*looks away*".
  Anything wrapped in asterisks is forbidden.
- To shape vocal delivery, you MAY use ElevenLabs v3 inline audio tags in
  square brackets, lowercase, placed at the start of the sentence or phrase
  they apply to.
- Use AT MOST one or two tags per response, and only when they genuinely
  change how the line is delivered. Overuse degrades quality.
- Audio tags ONLY influence voice delivery — they are not descriptions of
  actions. Prefer "[sighs] I saw it too" over any asterisk prose.
- Never describe physical actions. The audience hears your voice; they do
  not see you.

Supported audio tags (use ONLY these; any other bracketed text will be read
aloud verbatim):
- Emotions: [happy], [sad], [angry], [excited], [nervous], [bored],
  [sarcastic], [curious], [confused], [surprised], [disappointed],
  [amused], [defeated], [hopeful]
- Non-verbal sounds: [laughs], [laughs harder], [giggles], [chuckles],
  [sighs], [exhales], [gasps], [crying], [sobbing], [screams],
  [clears throat], [coughs], [sniffs], [groans]
- Delivery style: [whispers], [shouts], [mumbles], [stutters], [sings],
  [softly], [quietly], [loudly], [strongly]
- Pacing: [pauses], [long pause], [hesitates]`);

  return sections.join("\n\n---\n\n");
}

/**
 * Extracts the depth level instruction string from a fully assembled prompt.
 * Used by property tests to verify the correct depth level is present.
 *
 * Requirements: 19.3 (Property 15)
 */
export function extractDepthLevelFromPrompt(prompt: string): DepthLevel | null {
  if (prompt.includes("DEPTH LEVEL: CASUAL")) return "Casual";
  if (prompt.includes("DEPTH LEVEL: INTERMEDIATE")) return "Intermediate";
  if (prompt.includes("DEPTH LEVEL: SCHOLAR")) return "Scholar";
  return null;
}

/**
 * Returns the set of depth level marker strings that should NOT appear
 * in a prompt for the given depth level.
 */
export function getOtherDepthLevelMarkers(depthLevel: DepthLevel): string[] {
  const all: DepthLevel[] = ["Casual", "Intermediate", "Scholar"];
  return all
    .filter((d) => d !== depthLevel)
    .map((d) => `DEPTH LEVEL: ${d.toUpperCase()}`);
}
