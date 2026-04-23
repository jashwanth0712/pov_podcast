# Implementation Plan: POV Podcast

## Overview

Implement the POV Podcast platform incrementally, starting with the data layer and authentication, then building the scenario library and generation pipeline, followed by the session player with persona agents, branching dialogue, and finally the advanced features (emotional state tracking, context compaction, conversation tree navigation, and content moderation). Each task builds directly on the previous, wiring components together as they are completed.

## Environment Variables (already configured in Convex)

The following API keys are already set in the Convex deployment environment and can be accessed from Convex actions via `process.env.<VAR_NAME>`. Do NOT hardcode or prompt for these — read them from env. To view or update: `npx convex env list` / `npx convex env set <KEY> <VALUE>`.

- `ELEVENLABS_API_KEY` — ElevenLabs API key. Used for:
  - TTS WebSocket streaming (task 16.1): `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id=eleven_flash_v2_5`
  - Scribe STT (task 15.1): `POST https://api.elevenlabs.io/v1/speech-to-text` with `model_id: "scribe_v1"`
  - Voice ID catalogue lookup (already used in scenario generation)
- `OPENROUTER_API_KEY` — OpenRouter key for dialogue generation, moderator turns, content moderation, context compaction, and scenario generation.
- `OPENROUTER_MODEL` — OpenRouter model ID for text generation.
- `RUNPOD_ENDPOINT_URL` — RunPod endpoint for avatar/image generation.
- `GEMINI_MODEL_ID` — Gemini model ID (where applicable).

**Security note — browser ElevenLabs access:** Do NOT expose `ELEVENLABS_API_KEY` to the client bundle. For STT (task 15.1), upload the audio blob to a Convex HTTP action that proxies to ElevenLabs. For TTS WebSocket streaming (task 16.1), either (a) have the client send text to a Convex action that opens the ElevenLabs WS and streams base64 audio chunks back, or (b) mint short-lived signed request URLs server-side. The API key must never leave the server.

## Tasks

- [ ] 1. Project setup and data schema
  - Initialise the Next.js project with TypeScript and configure the Convex backend
  - Define all Convex table schemas: `scenarios`, `personas`, `personaRelationships`, `sessions`, `branches`, `dialogueTurns`, `personaAgentStates`, `deadlockEvents`, `rejectedInterruptions`, `userPreferences`
  - Define all shared TypeScript interfaces: `ArticleReference`, `EmotionalState`, `ContextMessage`, `CompactionSummary`, `VoiceParams`
  - Configure environment variables for `OPENROUTER_MODEL`, `RUNPOD_ENDPOINT_URL`, `GEMINI_MODEL_ID`, and `ELEVENLABS_API_KEY` (configured via `npx convex env set`)
  - _Requirements: 3.3, 12.1, 21.2_

- [x] 2. Authentication
  - [x] 2.1 Implement Convex Auth with email/password registration and login
    - Wire up `AuthForms` component (registration, login, forgot-password, reset-password)
    - Enforce password complexity: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit
    - Implement `deleteUserAccount` mutation that schedules data removal within 30 days
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 2.2 Write property test for password complexity validation
    - **Property 12: Password Complexity Validation**
    - **Validates: Requirements 11.2**

  - [x] 2.3 Guard session and scenario creation behind authentication
    - Redirect unauthenticated users to login when they attempt to start a session or generate a scenario
    - _Requirements: 11.4_

- [x] 3. Scenario library — data and queries
  - [x] 3.1 Seed the 12 pre-built scenarios and their curated personas
    - Create a Convex seed script that inserts all 12 scenarios with `isPrebuilt: true`, their time periods, eras, descriptions, and the full curated persona catalogue (6 personas each)
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement `getScenarios(filter?)` Convex query
    - Return all scenarios, optionally filtered by era
    - _Requirements: 1.5, 1.6_

  - [x] 3.3 Implement `HomePage` component
    - Render "Historical Scenarios" grid (12 pre-built cards) and "Your Scenarios" grid
    - Implement era filter chips (All / Modern / Contemporary) that update the displayed list within 300ms
    - Navigate to `SessionSetup` on card click within 500ms
    - Display content disclaimer on each scenario card/page
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 8.2_

  - [x] 3.4 Implement `ScenarioCard` component
    - Display era badge, title, time period, description (≤200 chars), and up to 6 persona avatar thumbnails
    - _Requirements: 1.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Scenario generation pipeline
  - [x] 5.1 Implement topic input validation
    - Reject topics shorter than 3 characters with a validation error; accept 3–500 characters
    - _Requirements: 2.2, 2.5_

  - [x] 5.2 Write property test for scenario topic input validation
    - **Property 9: Scenario Topic Input Validation**
    - **Validates: Requirements 2.2, 2.5**

  - [x] 5.3 Implement `generateScenario` Convex action
    - Call OpenRouter to produce title, time period, description, up to 6 personas (each with personality description, emotional backstory ≥100 words, speaking style, ideological position, geographic origin, age, gender), and initial dialogue outline
    - Assign ElevenLabs voice IDs via voice matching (geographic/cultural origin, age, gender)
    - Persist scenario and personas to Convex; associate with authenticated user via `ctx.auth`
    - Enforce 30-second timeout; return error and offer retry on failure
    - Enforce maximum of 6 personas per scenario
    - See [OpenRouter API documentation](./openrouter-api.md) for endpoint format and prompt templates
    - See [Convex patterns](./convex-patterns.md) for action/mutation patterns
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 3.1_

  - [x] 5.4 Implement `generateAvatars` Convex action
    - Call RunPod endpoint with persona name, role, era, physical description, and personality traits
    - Poll `GET /status/{jobId}` until `status === "COMPLETED"`
    - Store profile and portrait image URLs in persona record; set `avatarGenerationStatus`
    - On failure: set status to `"failed"`, schedule background retry (exponential backoff: 1 min, 5 min, 30 min)
    - Read endpoint URL and model ID from environment variables
    - See [=\d API documentation](./runpod-api.md) for API format and prompt construction
    - _Requirements: 22.1, 22.2, 22.3, 22.5, 22.6_

  - [x] 5.5 Implement `ScenarioGenerator` multi-step component
    - Step 1: topic input with character counter and validation
    - Step 2: animated generation progress showing personas appearing one by one
    - Step 3: `PersonaEditor` review before confirming
    - Navigate to `SessionSetup` on completion
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.6 Implement `PersonaEditor` component
    - Render each persona as an expandable card with avatar (loading spinner / initials fallback), name, role, personality summary
    - Support edit (inline expansion with all fields), delete (with confirmation), and add actions
    - Enforce 6-persona maximum with warning
    - Wire to `updatePersona`, `deletePersona` (min 2 personas), and `addPersona` mutations
    - _Requirements: 2.7, 22.4, 22.5_

  - [x] 5.7 Implement `validateArticleUrl` action and article reference generation
    - HEAD-request each generated URL; flag as `isVerified: false` if unreachable
    - Label article references as `isIllustrative: true` for fictional/speculative scenarios
    - _Requirements: 13.7, 13.8_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Session setup and persona agent instantiation
  - [x] 7.1 Implement `SessionSetup` component
    - Depth level picker (Casual / Intermediate / Scholar), optional Calibration Persona flow, turn-taking mode selector (default: Relevance)
    - Persist selected depth level to `userPreferences` via `updateUserDefaultDepthLevel`; load stored default on next session start
    - _Requirements: 14.10, 19.1, 19.2, 19.4, 19.5_

  - [x] 7.2 Implement `startSession` Convex mutation
    - Create session record; derive `userId` from `ctx.auth`
    - Instantiate `personaAgentStates` records for each persona with initial emotional state
    - Create root branch record
    - _Requirements: 3.3, 4.1, 14.10_

  - [x] 7.3 Implement persona system prompt assembly
    - Build system prompt encoding name, historical role, ≥3 personality traits, emotional backstory (≥200 words), speaking style, ideological position, ≥3 article references, and all pairwise relationship descriptors
    - Apply depth level modifier (Casual / Intermediate / Scholar) to the prompt
    - Apply emotional state modifier (mood, conviction, willingness to concede)
    - Apply relationship tone modifier when preceding turn is from a related persona
    - _Requirements: 3.4, 3.5, 15.1, 19.3, 20.2, 20.5, 21.4, 21.9_

  - [x] 7.4 Write property test for depth level presence in generation prompt
    - **Property 15: Depth Level Is Present in Every Generation Prompt**
    - **Validates: Requirements 19.3**

  - [x] 7.5 Implement `personaRelationships` seeding and `getPersonaStates` query
    - Define all pairwise relationships for each pre-built scenario
    - Expose real-time query for current emotional state per persona
    - _Requirements: 20.1, 20.2_

- [x] 8. Dialogue turn generation and orchestration
  - [x] 8.1 Implement `generatePersonaTurn` Convex action
    - Assemble context window: system prompt + compaction summaries + recent context messages + shared conversation log
    - Call OpenRouter with assembled context (`max_tokens: 400`, `temperature: 0.8`)
    - Validate expressiveness (emotional statement, personal struggle reference, or ideological assertion); regenerate once on failure; deliver with `qualityWarning: true` after two failures
    - Validate consistency with persona backstory/ideology (same regeneration budget)
    - Persist turn via `persistDialogueTurn`; update emotional state; check if compaction is needed
    - See [OpenRouter API documentation](./openrouter-api.md) for dialogue turn generation config
    - See [Convex patterns](./convex-patterns.md) for action patterns with scheduled mutations
    - _Requirements: 3.3, 3.5, 8.1, 8.3, 8.4, 8.5, 8.6, 15.2, 15.4, 15.8_

  - [x] 8.2 Write property test for expressiveness validation
    - **Property 14: Expressiveness Validation Accepts Turns with Required Elements**
    - **Validates: Requirements 15.2**

  - [x] 8.3 Implement relevance scoring algorithm in `orchestrateTurn`
    - Score each persona: `emotionalRelevanceScore × 0.4 + relationshipFactor × 0.3 + ideologicalTensionScore × 0.3`
    - Exclude last speaker; factor in relationship dynamics (rival/ally bonuses)
    - Pre-generate 2–4 turns ahead in parallel (text only)
    - _Requirements: 14.2, 20.3, 21.6_

  - [x] 8.4 Write property test for Round Robin turn-taking
    - **Property 6: Round Robin Turn-Taking Cycles Through All Personas**
    - **Validates: Requirements 14.3**

  - [x] 8.5 Write property test for Random turn-taking
    - **Property 7: Random Turn-Taking Never Repeats Last Speaker**
    - **Validates: Requirements 14.4**

  - [x] 8.6 Implement Round Robin and Random turn-taking modes
    - Round Robin: advance `roundRobinIndex` pointer, wrap around
    - Random: random draw excluding last speaker
    - _Requirements: 14.3, 14.4_

  - [x] 8.7 Implement deadlock detection and moderator escalation
    - Detect ≥3 consecutive turns with identical ideological position markers
    - On deadlock: trigger `generateModeratorTurn` or inject topic nudge
    - Log deadlock event to `deadlockEvents` table
    - Implement `generateModeratorTurn` action (neutral voice, no historical POV, within 5 seconds)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 8.8 Write property test for deadlock detection
    - **Property 13: Deadlock Detection Fires on Repeated Positions**
    - **Validates: Requirements 17.1**

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Dialogue turn serialisation and persistence
  - [x] 10.1 Implement dialogue turn serialisation/deserialisation
    - Serialise each turn to JSON with fields: `personaId`, `turnIndex`, `text`, `audioUrl`, `timestamp`
    - Deserialise and validate all required fields; return descriptive error and block persistence on missing fields
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 10.2 Write property test for dialogue turn serialisation round-trip
    - **Property 1: Dialogue Turn Serialisation Round-Trip**
    - **Validates: Requirements 12.1, 12.2, 12.3**

  - [x] 10.3 Write property test for incomplete dialogue turn rejection
    - **Property 2: Incomplete Dialogue Turn Documents Are Rejected**
    - **Validates: Requirements 12.4**

  - [x] 10.4 Implement `persistDialogueTurn` mutation
    - Save turn after every dialogue turn so no more than one turn of progress is lost
    - Attach article references and emotional state snapshot to the turn record
    - Set `qualityWarning` flag when applicable
    - _Requirements: 7.4, 13.2, 21.1_

- [x] 11. Branching dialogue and conversation tree
  - [x] 11.1 Implement `createBranch` and `navigateToBranch` mutations
    - Record fork point turn index and parent branch ID on new branch
    - Restore all persona emotional states to the values recorded at the fork point
    - Navigate to branch and restore last position within 500ms
    - _Requirements: 4.9, 5.4, 16.1, 16.2, 16.4, 21.8_

  - [x] 11.2 Write property test for branch fork preserving prior history
    - **Property 4: Branch Fork Preserves Prior History**
    - **Validates: Requirements 16.1, 5.4**

  - [x] 11.3 Implement `pruneBranch` mutation and `autoPruneBranches` scheduled function
    - Delete all turns, audio URLs, and emotional state snapshots for pruned branches
    - Fire `autoPruneBranches` when session transitions to `paused` or `completed`; prune all branches where `lastNavigatedAt` is null
    - _Requirements: 16.6, 16.7_

  - [x] 11.4 Implement `getConversationTree` query and conversation tree UI
    - Return all branches and fork points for a session
    - Render visual conversation tree in `SessionSettingsSheet` showing all branches, fork points, and current position
    - Display branch fork dividers in the transcript panel
    - _Requirements: 4.10, 16.3, 16.5_

- [x] 12. Context compaction
  - [x] 12.1 Implement `compactPersonaContext` Convex action
    - Trigger when a persona agent's context window reaches 20 messages
    - Generate structured summary via OpenRouter capturing key events, emotional arc, ideological positions, and concessions
    - Replace 20 raw messages with single summary prepended with `[COMPACTED HISTORY]` marker
    - Persist summary to `personaAgentStates`; retain raw messages and retry on next turn if compaction fails
    - See [OpenRouter API documentation](./openrouter-api.md) for context compaction config and prompt template
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [x] 12.2 Write property test for context compaction
    - **Property 8: Context Compaction Replaces Messages with Marked Summary**
    - **Validates: Requirements 23.2, 23.3, 23.4, 23.5**

- [x] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. User interruption and content moderation
  - [x] 14.1 Implement interruption input validation
    - Reject inputs of length 0 or composed entirely of whitespace; accept 1–1000 non-whitespace-containing characters
    - _Requirements: 5.3, 5.8_

  - [x] 14.2 Write property test for interruption input validation
    - **Property 3: Interruption Input Validation Boundaries**
    - **Validates: Requirements 5.3, 5.8**

  - [x] 14.3 Implement `moderateInterruption` Convex action
    - Call OpenRouter with classification prompt; enforce 2-second timeout
    - Return `SAFE` / `UNSAFE` with reason
    - Log rejected interruptions (session ID, timestamp, reason) to `rejectedInterruptions` — do NOT store full content
    - See [OpenRouter API documentation](./openrouter-api.md) for content moderation config with timeout
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x] 14.4 Implement `submitInterruption` Convex mutation
    - Orchestrate: validate → moderate → record fork point → `createBranch` → `generatePersonaTurn` responding to user input within 5 seconds
    - Incorporate user message into new branch context
    - Continue generating turns on new branch influenced by user input
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [x] 15. Voice input (STT)
  - [x] 15.1 Implement `VoiceEngine.transcribeSpeech` using ElevenLabs Scribe API
    - `POST /v1/speech-to-text` with `model_id: "scribe_v1"`; populate interruption text field within 3 seconds
    - On error: display error message and retain text input field
    - **Use ElevenLabs Power** (Kiro skill) to learn STT API details and best practices
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 15.2 Implement voice input UI in interruption interface
    - Push-to-talk mic button; request microphone permission with explanation
    - Show recording indicator while capturing; disable voice input and show message if permission denied
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

- [x] 16. Audio streaming (TTS)
  - [x] 16.1 Implement `VoiceEngine` TTS WebSocket service
    - Connect to `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id=eleven_flash_v2_5`
    - Send BOS message with voice settings, stream text chunks, send EOS; decode base64 audio chunks and feed to Web Audio API
    - Begin playback of first chunk within 2 seconds of stream opening
    - Transition to next turn within 1 second of `isFinal` event
    - On mid-turn stream interruption: attempt resume; fall back to full text transcript
    - **Use ElevenLabs Power** (Kiro skill) to learn TTS WebSocket streaming, voice settings, and voice ID selection
    - _Requirements: 3.2, 3.6, 3.8, 4.1, 4.5, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6_

  - [x] 16.2 Implement emotional state → voice parameter mapping
    - Map mood to `VoiceParams`: calm → stability 0.75/style 0.2; frustrated → 0.35/0.8; passionate → 0.45/0.75; defensive → 0.55/0.6; resigned → 0.80/0.1
    - _Requirements: 21.5_

  - [x] 16.3 Write property test for emotional state to voice parameter mapping
    - **Property 5: Emotional State Mapping to Voice Parameters**
    - **Validates: Requirements 21.5**

  - [x] 16.4 Implement audio buffering
    - Buffer at least one synthesised audio turn ahead of playback
    - _Requirements: 10.2_

- [x] 17. Session player UI
  - [x] 17.1 Implement `SessionPlayer` with `StageArea` and `PersonaGrid`
    - Large avatar (~120px) of currently speaking persona with animated pulsing coloured ring, name, role, and emotional state badge
    - Responsive 4-column grid of all other personas (~64px avatars) with per-avatar speaking ring activation; user's own avatar labelled "You"
    - Tapping a persona avatar shows popover with "Force speak next" option (wired to `forceNextSpeaker` mutation)
    - Display initials-based fallback avatar when `avatarGenerationStatus !== "complete"`
    - _Requirements: 3.7, 4.2, 14.7, 15.7, 17.7, 21.7, 22.4_

  - [x] 17.2 Implement `ControlsBar` with PTT mic, participants, settings, and transcript toggle
    - Turn-taking mode selector and depth level switcher in `SessionSettingsSheet`
    - Moderator trigger button (wired to `triggerModerator` mutation, generates turn within 5 seconds)
    - Relationship map and source map views in `SessionSettingsSheet`
    - _Requirements: 14.5, 14.6, 14.7, 17.4, 18.4, 20.4_

  - [x] 17.3 Implement `TranscriptPanel` bottom sheet
    - Unified transcript + chat: per-message avatar, speaker name + role + timestamp, text, inline citation chips (open URL in new tab), branch fork dividers
    - Text input bar (1–1000 chars) and PTT mic button
    - Scrollable at all times; attribute each turn to correct persona, "You", or "Moderator"
    - Display bias label "Cited by [Persona Name] — reflects their perspective" adjacent to every citation
    - _Requirements: 4.3, 5.9, 9.1, 13.3, 13.4, 13.5, 13.6, 18.2, 18.3_

  - [x] 17.4 Write property test for transcript completeness and attribution
    - **Property 10: Transcript Completeness and Attribution**
    - **Validates: Requirements 4.3, 5.9, 9.1**

  - [x] 17.5 Write property test for article references in rendered turns
    - **Property 11: Article References Appear in Rendered Turns**
    - **Validates: Requirements 13.3, 13.4**

- [-] 18. Session persistence and history
  - [x] 18.1 Implement `pauseSession`, `resumeSession`, and `endSession` mutations
    - Pause: stop playback immediately, preserve dialogue position
    - Resume: restore from preserved position within 1 second
    - End: mark as completed, block further turns
    - _Requirements: 4.7, 4.8, 7.5_

  - [x] 18.2 Implement `getUserSessions` query and `SessionHistory` component
    - List past sessions ordered by most recent activity; show scenario title and last-activity date
    - Clicking a session restores it to last saved state
    - _Requirements: 7.2, 7.3_

  - [x] 18.3 Implement connection interruption handling
    - Display reconnection indicator on Convex WebSocket disconnection
    - Retry every 5 seconds for up to 60 seconds; re-subscribe to all active queries on reconnect
    - After 60 seconds: display error and preserve transcript in local state
    - _Requirements: 10.3, 10.4_

- [x] 19. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Accessibility and performance
  - [x] 20.1 Implement keyboard navigation and ARIA labels
    - All interactive controls (play, pause, interrupt, submit) operable via keyboard alone
    - ARIA labels on all interactive controls and dynamic content regions
    - Update transcript and speaking indicator simultaneously when speaking persona changes
    - _Requirements: 9.2, 9.3, 9.5_

  - [x] 20.2 Implement colour contrast and visual compliance
    - Maintain ≥4.5:1 contrast ratio for all body text (WCAG 2.1 AA)
    - _Requirements: 9.4_

  - [x] 20.3 Implement home page performance optimisation
    - Ensure home page (including scenario library) loads within 3 seconds on 10 Mbps connection
    - _Requirements: 10.1_

- [-] 21. Source map and relationship map
  - [-] 21.1 Implement source map view
    - Collect all article references surfaced during a session; deduplicate and group by citing persona
    - Annotate each reference with ideological alignment relative to other sources in the map
    - On selection: display persona-generated explanation of why the source was cited
    - _Requirements: 13.5, 18.4, 18.5_

  - [-] 21.2 Implement relationship map view
    - Display all personas as nodes with pairwise relationship edges labelled by type (alliance, rivalry, mentor/student, ideological kinship, historical enmity)
    - _Requirements: 20.4_

- [ ] 22. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each major milestone
- Property tests use fast-check with a minimum of 100 iterations per property; tag each test with `// Feature: pov-podcast, Property {N}: {property_text}`
- Unit tests and property tests are complementary — unit tests cover specific examples and edge cases, property tests validate universal correctness guarantees
- The design uses TypeScript throughout (Next.js frontend + Convex backend)
