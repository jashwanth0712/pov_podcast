/**
 * Model configuration for different task types.
 *
 * Semantic model roles:
 * - thinking: Complex reasoning tasks (scenario generation, persona creation)
 * - conversation: Dialogue generation (persona turns, responses)
 * - light: Fast tasks (moderation, validation, classification)
 *
 * Each can be overridden via environment variable.
 */
export const models = {
  // Complex reasoning: scenario generation, persona creation
  thinking: process.env.THINKING_MODEL ?? "anthropic/claude-opus-4.5",

  // Dialogue: persona turns, conversation generation
  conversation: process.env.CONVERSATION_MODEL ?? "anthropic/claude-sonnet-4",

  // Fast tasks: moderation, validation, classification
  light: process.env.LIGHT_MODEL ?? "anthropic/claude-haiku-4-5-20251001",
} as const;

export type ModelRole = keyof typeof models;

export function getModel(role: ModelRole): string {
  return models[role];
}
