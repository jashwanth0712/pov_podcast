import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  scenarios: defineTable({
    title: v.string(),
    timePeriod: v.string(),
    era: v.union(
      v.literal("Ancient"),
      v.literal("Medieval"),
      v.literal("Modern"),
      v.literal("Contemporary")
    ),
    description: v.string(),
    isPrebuilt: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    personaIds: v.array(v.id("personas")),
    initialDialogueOutline: v.string(),
    contentDisclaimer: v.string(),
    bannerImageUrl: v.optional(v.string()),
    bannerImageStorageId: v.optional(v.id("_storage")),
    bannerGenerationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    )),
    musicStorageId: v.optional(v.id("_storage")),
    musicGeneratedAt: v.optional(v.number()),
    musicMoodLabel: v.optional(v.string()),
    musicGenerationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    )),
    musicGenerationPrompt: v.optional(v.string()),
  }).index("by_era", ["era"]).index("by_createdBy", ["createdBy"]),

  personas: defineTable({
    scenarioId: v.id("scenarios"),
    name: v.string(),
    historicalRole: v.string(),
    personalityTraits: v.array(v.string()),
    emotionalBackstory: v.string(),
    speakingStyle: v.string(),
    ideologicalPosition: v.string(),
    geographicOrigin: v.string(),
    estimatedAge: v.number(),
    gender: v.string(),
    voiceId: v.string(),
    articleReferences: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        isVerified: v.boolean(),
        isIllustrative: v.boolean(),
        ideologicalAlignment: v.string(),
      })
    ),
    profileImageUrl: v.optional(v.string()),
    profileImageStorageId: v.optional(v.id("_storage")),
    avatarGenerationStatus: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
    sfxStorageId: v.optional(v.id("_storage")),
    sfxGeneratedAt: v.optional(v.number()),
    sfxGenerationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    )),
    sfxGenerationPrompt: v.optional(v.string()),
  }).index("by_scenarioId", ["scenarioId"]),

  personaRelationships: defineTable({
    scenarioId: v.id("scenarios"),
    personaAId: v.id("personas"),
    personaBId: v.id("personas"),
    relationshipType: v.union(
      v.literal("alliance"),
      v.literal("rivalry"),
      v.literal("mentor_student"),
      v.literal("ideological_kinship"),
      v.literal("historical_enmity")
    ),
    description: v.string(),
  }).index("by_scenarioId", ["scenarioId"]),

  sessions: defineTable({
    userId: v.id("users"),
    scenarioId: v.id("scenarios"),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
    turnTakingMode: v.union(
      v.literal("Relevance"),
      v.literal("RoundRobin"),
      v.literal("Random")
    ),
    activeBranchId: v.optional(v.id("branches")),
    createdAt: v.number(),
    lastActivityAt: v.number(),
    roundRobinIndex: v.number(),
  }).index("by_userId", ["userId"]).index("by_userId_lastActivity", ["userId", "lastActivityAt"]),

  branches: defineTable({
    sessionId: v.id("sessions"),
    parentBranchId: v.optional(v.id("branches")),
    forkPointTurnIndex: v.optional(v.number()),
    forkPointTurnId: v.optional(v.id("dialogueTurns")),
    createdAt: v.number(),
    lastNavigatedAt: v.optional(v.number()),
    isPruned: v.boolean(),
  }).index("by_sessionId", ["sessionId"]),

  dialogueTurns: defineTable({
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    turnIndex: v.number(),
    speakerId: v.union(v.id("personas"), v.literal("user"), v.literal("moderator")),
    speakerName: v.string(),
    text: v.string(),
    audioUrl: v.optional(v.string()),
    timestamp: v.number(),
    articleReferences: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        isVerified: v.boolean(),
        isIllustrative: v.boolean(),
        ideologicalAlignment: v.string(),
      })
    ),
    emotionalStateSnapshot: v.optional(
      v.object({
        mood: v.union(
          v.literal("calm"),
          v.literal("frustrated"),
          v.literal("passionate"),
          v.literal("defensive"),
          v.literal("resigned")
        ),
        convictionLevel: v.number(),
        willingnessToConcede: v.number(),
      })
    ),
    qualityWarning: v.boolean(),
    isUserInterruption: v.boolean(),
    depthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
  }).index("by_sessionId_branchId", ["sessionId", "branchId"])
    .index("by_branchId_turnIndex", ["branchId", "turnIndex"]),

  personaAgentStates: defineTable({
    sessionId: v.id("sessions"),
    personaId: v.id("personas"),
    branchId: v.id("branches"),
    emotionalState: v.object({
      mood: v.union(
        v.literal("calm"),
        v.literal("frustrated"),
        v.literal("passionate"),
        v.literal("defensive"),
        v.literal("resigned")
      ),
      convictionLevel: v.number(),
      willingnessToConcede: v.number(),
    }),
    contextMessages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
        personaId: v.optional(v.id("personas")),
        turnIndex: v.number(),
      })
    ),
    compactionSummaries: v.array(
      v.object({
        summary: v.string(),
        coveredTurnRange: v.array(v.number()),
        generatedAt: v.number(),
        marker: v.literal("[COMPACTED HISTORY]"),
      })
    ),
    messageCount: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_sessionId_personaId", ["sessionId", "personaId"])
    .index("by_sessionId_branchId", ["sessionId", "branchId"]),

  deadlockEvents: defineTable({
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    detectedAtTurnIndex: v.number(),
    escalationAction: v.union(
      v.literal("moderator_turn"),
      v.literal("topic_nudge")
    ),
    timestamp: v.number(),
  }).index("by_sessionId", ["sessionId"]),

  rejectedInterruptions: defineTable({
    sessionId: v.id("sessions"),
    timestamp: v.number(),
    rejectionReason: v.string(),
  }).index("by_sessionId", ["sessionId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    defaultDepthLevel: v.union(
      v.literal("Casual"),
      v.literal("Intermediate"),
      v.literal("Scholar")
    ),
    updatedAt: v.number(),
    ambientMusicVolume: v.optional(v.number()),
    ambientSfxVolume: v.optional(v.number()),
    ambientMuted: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  // Account deletion scheduling
  accountDeletionRequests: defineTable({
    userId: v.id("users"),
    requestedAt: v.number(),
    scheduledDeletionAt: v.number(), // requestedAt + 30 days
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  }).index("by_userId", ["userId"])
    .index("by_status_scheduledAt", ["status", "scheduledDeletionAt"]),
});
