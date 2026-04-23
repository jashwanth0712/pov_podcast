# Implementation Plan: ElevenLabs Ambient Audio

## Overview

Implement two independently controllable ambient audio layers (background music + character sound effects) beneath the primary TTS speech in POV Podcast sessions. Audio is generated server-side via ElevenLabs APIs, cached in Convex file storage, and played client-side via a new `AmbientEngine` that shares the existing `AudioContext` with `VoiceEngine`.

The implementation follows the established `generateAvatars` / `generateBanner` pattern for server-side generation and the `VoiceEngine` pattern for client-side Web Audio API usage.

## Tasks

- [x] 1. Extend Convex schema with ambient audio fields
  - Add `musicStorageId`, `musicGeneratedAt`, `musicMoodLabel`, `musicGenerationStatus`, and `musicGenerationPrompt` optional fields to the `scenarios` table in `convex/schema.ts`
  - Add `sfxStorageId`, `sfxGeneratedAt`, `sfxGenerationStatus`, and `sfxGenerationPrompt` optional fields to the `personas` table in `convex/schema.ts`
  - Add `ambientMusicVolume`, `ambientSfxVolume`, and `ambientMuted` optional fields to the `userPreferences` table in `convex/schema.ts`
  - _Requirements: 4.1, 4.2, 3.7, 7.1, 7.2_

- [x] 2. Implement pure prompt-builder functions and cache/mood utilities
  - [x] 2.1 Create `convex/lib/ambientAudioPrompts.ts` with `buildEmotionalToneProfile` and `buildSoundEffectPrompt` pure functions
    - `buildEmotionalToneProfile` takes scenario fields (title, era, timePeriod, description, initialDialogueOutline, dominantMood?) and returns a 20–120 word natural-language prompt
    - `buildSoundEffectPrompt` takes persona fields (historicalRole, geographicOrigin) and scenario fields (era, title) and returns a 10–60 word ambient sound description
    - _Requirements: 1.2, 2.2_

  - [x] 2.2 Write property test for `buildEmotionalToneProfile` word count
    - **Property 1: Emotional Tone Profile word count**
    - **Validates: Requirements 1.2**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 1`

  - [x] 2.3 Write property test for `buildSoundEffectPrompt` word count
    - **Property 2: Sound Effect Prompt word count**
    - **Validates: Requirements 2.2**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 2`

  - [x] 2.4 Create `convex/lib/ambientAudioCache.ts` with `isCacheStale`, `computeDominantMood`, `detectEmotionalToneShift`, and `canTriggerToneShift` pure functions
    - `isCacheStale(generatedAt, now)` returns true iff `(now - generatedAt) > 90 * 24 * 60 * 60 * 1000`
    - `computeDominantMood(moods)` returns the most frequent mood with deterministic tie-breaking
    - `detectEmotionalToneShift(moodHistory, currentMood)` returns true iff the last 3 entries equal `currentMood` and differ from the entry before them
    - `canTriggerToneShift(lastShiftTimestamp, now)` returns true iff null or gap ≥ 5 minutes
    - _Requirements: 4.4, 6.1, 6.2, 6.6_

  - [x] 2.5 Write property tests for cache and mood utilities
    - **Property 6: Cache staleness check** — `isCacheStale` matches 90-day threshold exactly
    - **Property 7: Dominant mood computation** — returns most frequent mood
    - **Property 8: Emotional tone shift detection and rate limiting**
    - **Validates: Requirements 4.4, 6.1, 6.2, 6.6**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 6/7/8`

- [x] 3. Implement ambient audio Convex mutations
  - Create `convex/ambientAudioMutations.ts` with `updateScenarioMusicStatus` and `updatePersonaSfxStatus` internal mutations, mirroring the `avatarMutations.ts` pattern
  - `updateScenarioMusicStatus` patches `musicStorageId`, `musicGeneratedAt`, `musicMoodLabel`, `musicGenerationStatus`, `musicGenerationPrompt` on the scenarios table
  - `updatePersonaSfxStatus` patches `sfxStorageId`, `sfxGeneratedAt`, `sfxGenerationStatus`, `sfxGenerationPrompt` on the personas table
  - _Requirements: 4.1, 4.2, 7.1, 7.2_

- [x] 4. Implement `generateBackgroundMusic` Convex action
  - Create `convex/generateBackgroundMusic.ts` as a `"use node"` internal action
  - Check `scenarios.musicGenerationStatus` — if `"pending"`, return early (idempotency guard per Req 4.6)
  - If `"complete"` and not stale (use `isCacheStale`), return existing `storageId`
  - Set status to `"pending"` via `updateScenarioMusicStatus`, call ElevenLabs Music API (`client.music.compose` from `@elevenlabs/elevenlabs-js`), store result in Convex file storage, update scenario with `musicStorageId`, `musicGeneratedAt`, `musicMoodLabel`, status `"complete"`
  - On `bad_prompt` error: retry once with simplified prompt (era + timePeriod only)
  - On timeout (>15s) or other failure: set status `"failed"`, return `{ success: false }`
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 4.1, 4.4, 4.6, 6.3, 6.4, 7.1, 7.4_

- [x] 5. Implement `generateCharacterSoundEffect` Convex action
  - Create `convex/generateCharacterSoundEffect.ts` as a `"use node"` internal action
  - Check `personas.sfxGenerationStatus` — if `"pending"`, return early (idempotency guard)
  - If `"complete"` and not stale, return existing `storageId`
  - Set status to `"pending"`, call ElevenLabs Sound Effects API (`client.soundGeneration.convert` from `@elevenlabs/elevenlabs-js`), store result, update persona with `sfxStorageId`, `sfxGeneratedAt`, status `"complete"`
  - On `bad_prompt` error: retry once with generic era-based ambient prompt
  - On timeout (>10s) or other failure: set status `"failed"`, return `{ success: false }`
  - _Requirements: 2.1, 2.3, 2.6, 4.2, 4.6, 7.2, 7.4_

- [x] 6. Implement `getAmbientAudioUrls` Convex query and wire generation into `generateScenario`
  - [x] 6.1 Create `convex/ambientAudioQueries.ts` with the public `getAmbientAudioUrls(scenarioId, personaIds)` query
    - Returns `{ musicUrl: string | null, sfxUrls: Record<string, string | null> }` in a single round trip using `ctx.storage.getUrl()`
    - Returns `null` for any entity without a cached file; triggers background regeneration if `ctx.storage.getUrl()` returns null for a stored ID
    - _Requirements: 4.3, 4.5, 7.3_

  - [x] 6.2 Write property test for URL aggregation completeness
    - **Property 9: Ambient audio URL aggregation completeness**
    - **Validates: Requirements 7.3**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 9`

  - [x] 6.3 Extend `convex/generateScenario.ts` to schedule ambient audio generation after scenario creation
    - After the existing avatar/banner scheduling, add `ctx.scheduler.runAfter(0, internal.generateBackgroundMusic.generateBackgroundMusic, { scenarioId, emotionalToneProfile })` for the scenario
    - Add `ctx.scheduler.runAfter(0, internal.generateCharacterSoundEffect.generateCharacterSoundEffect, { personaId, soundEffectPrompt })` for each persona
    - Use `buildEmotionalToneProfile` and `buildSoundEffectPrompt` to construct prompts
    - _Requirements: 7.6, 2.1, 1.1_

- [x] 7. Checkpoint — Ensure all Convex backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement ambient audio record serialisation utilities
  - [x] 8.1 Create `src/lib/ambientAudioRecord.ts` with the `AmbientAudioRecord` interface and `validateAmbientAudioRecord` function
    - `AmbientAudioRecord` has required fields: `entityId`, `entityType`, `storageId`, `generationPrompt`, `generatedAt`; optional `moodLabel`
    - `validateAmbientAudioRecord(record)` returns a descriptive error object if any required field is missing/null, otherwise returns null
    - _Requirements: 8.1, 8.4_

  - [x] 8.2 Write property tests for serialisation round-trip and validation
    - **Property 10: Ambient audio record serialisation round-trip** — JSON serialise → deserialise → serialise produces identical output
    - **Property 11: Ambient audio record validation rejects incomplete records**
    - **Validates: Requirements 8.2, 8.3, 8.4**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 10/11`

- [x] 9. Implement `AmbientEngine` client-side class
  - [x] 9.1 Create `src/lib/ambientEngine.ts` with the `AmbientEngine` class
    - Constructor accepts an `AudioContext` (shared with `VoiceEngine`)
    - Implement `loadAudio(urls)` — fetches and decodes audio files for music and all persona SFX URLs
    - Implement `startMusic()` / `stopMusic()` — starts/stops looping `AudioBufferSourceNode` for background music
    - Implement `startSfxForPersona(personaId)` / `stopSfxForPersona(personaId)` — starts/stops looping SFX with 500ms fade-in/out (Req 2.4, 2.5, 2.7)
    - Implement `duckMusic()` — reduces music gain to 20% over 300ms (Req 3.4)
    - Implement `unduckMusic()` — restores music gain over 500ms (Req 3.5)
    - Implement `setMusicVolume(v)` / `setSfxVolume(v)` — applies gain within 200ms (Req 3.3)
    - Implement `setMuted(muted)` — toggles master gain without changing stored volume levels (Req 3.2)
    - Implement `pause()` / `resume()` — pauses/resumes all layers within 300ms (Req 3.8)
    - Implement `dispose()` — stops all sources and cleans up nodes
    - Use a master `GainNode` capped at 0.35 relative gain for the combined ambient ceiling (Req 3.6)
    - _Requirements: 2.4, 2.5, 2.7, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

  - [x] 9.2 Write property tests for volume and ducking calculations
    - **Property 3: Mute toggle preserves individual volume levels** — mute → unmute round-trip
    - **Property 4: Audio ducking calculation** — `computeDuckedVolume(v)` = `v * 0.20`, unduck restores `v`
    - **Property 5: Combined ambient gain ceiling** — combined gain ≤ 0.35 for all (m, s) pairs
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6**
    - Tag: `// Feature: elevenlabs-ambient-audio, Property 3/4/5`

  - [x] 9.3 Implement `crossfadeToNewMusic(newUrl, durationMs?)` on `AmbientEngine`
    - Fetches and decodes the new music URL, starts it at gain 0, crossfades from current track to new track over 4 seconds (default), disposes old source when complete
    - _Requirements: 6.3_

  - [x] 9.4 Write unit tests for `AmbientEngine` core behaviours
    - Verify `setMuted(true)` sets master gain to 0 without changing stored volume levels
    - Verify `duckMusic()` reduces music gain to 20% of current level
    - Verify `pause()` suspends playback and `resume()` restores it
    - _Requirements: 3.2, 3.4, 3.8_

- [x] 10. Implement `AmbientAudioControls` React component
  - Create `src/components/session/AmbientAudioControls.tsx`
  - Render "Background Music" labelled range input (0–100) with ARIA label `"Background music volume, currently {v}%"` (Req 5.2, 5.5)
  - Render "Character Sounds" labelled range input (0–100) with ARIA label `"Character sounds volume, currently {v}%"` (Req 5.2, 5.5)
  - Render global mute toggle button with ARIA label `"Mute ambient audio"` / `"Unmute ambient audio"` that updates within one render cycle (Req 5.3)
  - All controls keyboard-navigable with visible focus indicators (Req 5.4)
  - Default both volumes to 0 and `isMuted` to true (Req 5.1)
  - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 10.1 Write accessibility tests for `AmbientAudioControls`
    - Render with `@testing-library/react`; verify ARIA labels are present and update on state change
    - Verify all controls are reachable via keyboard (tabIndex, keydown handlers)
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 11. Integrate `AmbientEngine` and `AmbientAudioControls` into `SessionPlayer`
  - [x] 11.1 Add `useQuery(api.ambientAudioQueries.getAmbientAudioUrls, { scenarioId, personaIds })` to `SessionPlayer`
    - Skip query when `scenarioId` or `personaIds` are not yet available
    - _Requirements: 7.3_

  - [x] 11.2 Instantiate `AmbientEngine` alongside `VoiceEngine` in `SessionPlayer`
    - Share the same `AudioContext` instance between `VoiceEngine` and `AmbientEngine`
    - Call `ambientEngine.loadAudio(urls)` when `getAmbientAudioUrls` returns data
    - Start music within 3 seconds of the first dialogue turn's TTS playback starting (Req 1.7)
    - _Requirements: 1.7_

  - [x] 11.3 Wire `VoiceEngine.playTurn` callbacks to `AmbientEngine` ducking and SFX
    - Pass `onPlaybackStarted` → `ambientEngine.duckMusic()` + `ambientEngine.startSfxForPersona(personaId)`
    - Pass `onPlaybackComplete` → `ambientEngine.unduckMusic()` + `ambientEngine.stopSfxForPersona(personaId)`
    - _Requirements: 2.4, 2.5, 3.4, 3.5_

  - [x] 11.4 Implement emotional tone shift detection and crossfade in `SessionPlayer`
    - After each dialogue turn, compute dominant mood from `personaAgentStates` using `computeDominantMood`
    - Maintain a mood history array; call `detectEmotionalToneShift` and `canTriggerToneShift` to decide whether to request a new track
    - On shift: call `generateBackgroundMusic` with updated `emotionalToneProfile` and `moodLabel`, then `ambientEngine.crossfadeToNewMusic(newUrl)` on success
    - On failure: continue playing existing track without retry (Req 6.5)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 11.5 Persist and restore `AmbientVolumePrefs` via Convex `userPreferences`
    - Add `updateAmbientPreferences` internal mutation to `convex/userPreferencesMutations.ts` (or equivalent) that patches `ambientMusicVolume`, `ambientSfxVolume`, `ambientMuted`
    - Add `getAmbientPreferences` query that reads these fields from `userPreferences`
    - In `SessionPlayer`, load preferences on mount and apply to `AmbientEngine`; persist on every volume/mute change
    - _Requirements: 3.7_

  - [x] 11.6 Embed `AmbientAudioControls` in the `SettingsTab` inside `SessionSettingsSheet`
    - Import and render `AmbientAudioControls` within the existing `SettingsTab` component in `src/components/session/SessionSettingsSheet.tsx`
    - Wire `onMusicVolumeChange`, `onSfxVolumeChange`, and `onMuteToggle` callbacks through to `AmbientEngine` and preference persistence
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 11.7 Handle session pause/resume for ambient audio
    - When session status transitions to `"paused"`, call `ambientEngine.pause()`
    - When session status transitions back to `"active"`, call `ambientEngine.resume()`
    - _Requirements: 3.8_

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Wire all property-based tests into the test suite
  - Create `src/lib/__tests__/ambientAudioProperties.test.ts` consolidating all property tests (Properties 1–11) using `fast-check` with `numRuns: 100`
  - Each test tagged with `// Feature: elevenlabs-ambient-audio, Property N: <property text>`
  - _Requirements: 1.2, 2.2, 3.2, 3.4, 3.5, 3.6, 4.4, 6.1, 6.2, 6.6, 7.3, 8.2, 8.3, 8.4_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The `@elevenlabs/elevenlabs-js` package must be added to `package.json` before implementing tasks 4 and 5
- All Convex actions in tasks 4 and 5 must use `"use node"` directive (required for ElevenLabs SDK)
- `AmbientEngine` shares the `AudioContext` from `VoiceEngine` — do not create a second `AudioContext`
- Default ambient state is muted (Req 5.1): `ambientMusicVolume: 0`, `ambientSfxVolume: 0`, `ambientMuted: true`
- Property tests use `fast-check` which is already in `package.json`
- Run tests with `npm test` (runs `vitest run` for single execution)
