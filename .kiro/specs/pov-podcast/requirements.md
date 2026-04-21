# Requirements Document

## Introduction

POV Podcast is an AI-powered interactive podcast platform that recreates major historical events through multi-perspective conversations. Rather than presenting facts, the platform immerses users in the emotional experience of history — how it felt, what people believed, and why decisions were made. Each participant in a conversation is a distinct historical persona with a unique AI-generated voice (powered by ElevenLabs), personality, and emotional narrative. Users can listen passively or interrupt at any time to ask questions, share opinions, or steer the discussion. The platform ships with a curated set of pre-built historical scenarios and allows users to generate entirely new ones.

The system is built on a Next.js frontend, a Convex backend (which handles both data storage and authentication via Convex Auth), and the ElevenLabs API for voice synthesis and conversational AI.

---

## Glossary

- **Platform**: The POV Podcast web application as a whole.
- **Scenario**: A historical event or topic that serves as the context for a podcast session (e.g., "The Moon Landing", "The Fall of the Berlin Wall").
- **Persona**: An AI-driven character representing a real or archetypal historical figure, with a defined personality, emotional backstory, and assigned ElevenLabs voice.
- **Session**: A single interactive podcast playback instance in which the user listens to and optionally participates in a Scenario conversation.
- **Dialogue**: The turn-by-turn spoken exchange between two or more Personas within a Session.
- **Interruption**: A user-initiated input (text or voice) that pauses the Dialogue and injects the user's message into the conversation.
- **Scenario Generator**: The subsystem that accepts a user-provided topic and produces a new Scenario with Personas, backstories, and an initial Dialogue outline.
- **Voice Engine**: The ElevenLabs API integration responsible for synthesising speech for each Persona.
- **Convex Backend**: The serverless backend (Convex) that stores Scenarios, Personas, Sessions, and Dialogue history, orchestrates AI generation, and manages user authentication via Convex Auth.
- **Convex Auth**: The authentication system provided by Convex, used to handle user registration, login, and session management with email and password credentials.
- **User**: A person accessing the Platform through a web browser.
- **Moderator**: An optional meta-Persona that introduces the Scenario and manages turn-taking in the Dialogue.

---

## Requirements

### Requirement 1: Scenario Library

**User Story:** As a user, I want to browse a curated library of pre-built historical scenarios, so that I can quickly start an immersive podcast session without having to create one myself.

#### Acceptance Criteria

1. THE Platform SHALL display a Scenario library containing at least five pre-built Scenarios on the home page.
2. WHEN a user opens the Scenario library, THE Platform SHALL present each Scenario with a title, a time period, a brief description (maximum 200 characters), and a list of featured Persona names.
3. WHEN a user selects a Scenario from the library, THE Platform SHALL navigate the user to the Session setup page for that Scenario within 500ms.
4. THE Platform SHALL categorise Scenarios by historical era (e.g., Ancient, Medieval, Modern, Contemporary) and allow the user to filter by era.
5. WHEN a user applies an era filter, THE Platform SHALL update the displayed Scenario list to show only matching Scenarios within 300ms.

---

### Requirement 2: Scenario Generation

**User Story:** As a user, I want to generate a custom historical scenario from any topic I provide, so that I can explore events and perspectives beyond the pre-built library.

#### Acceptance Criteria

1. THE Platform SHALL provide a Scenario Generator interface accessible from the home page and the Scenario library.
2. WHEN a user submits a topic of between 3 and 500 characters to the Scenario Generator, THE Scenario Generator SHALL produce a new Scenario including a title, a time period, a description, at least two Personas, and an initial Dialogue outline within 30 seconds.
3. IF the Scenario Generator fails to produce a Scenario within 30 seconds, THEN THE Platform SHALL display an error message describing the failure and offer the user the option to retry.
4. WHEN the Scenario Generator produces a new Scenario, THE Convex Backend SHALL persist the Scenario so that the user can access it in future sessions.
5. IF a user submits a topic containing fewer than 3 characters, THEN THE Platform SHALL display a validation error and SHALL NOT submit the request to the Scenario Generator.
6. THE Scenario Generator SHALL assign each generated Persona a distinct personality description, an emotional backstory of at least 100 words, and a unique ElevenLabs voice ID.

---

### Requirement 3: Persona Definition and Voice Assignment

**User Story:** As a user, I want each historical persona to have a distinct voice and personality, so that I can tell the participants apart and feel the emotional weight of their perspectives.

#### Acceptance Criteria

1. THE Platform SHALL assign each Persona a unique ElevenLabs voice ID that is not shared with any other Persona within the same Scenario.
2. WHEN a Session begins, THE Voice Engine SHALL synthesise each Persona's speech using the voice ID assigned to that Persona.
3. THE Platform SHALL define each Persona with at least the following attributes: name, historical role, personality traits (minimum three), emotional backstory, and speaking style description.
4. WHEN a Persona speaks, THE Voice Engine SHALL apply voice settings (stability, similarity boost, style) that reflect the Persona's defined speaking style.
5. THE Platform SHALL display each Persona's name, role, and a brief personality summary in the Session interface so the user can identify who is speaking.
6. IF the Voice Engine returns an error for a Persona's speech synthesis request, THEN THE Platform SHALL retry the request once and, if the retry fails, SHALL display a text transcript of the Persona's turn in place of audio.

---

### Requirement 4: Session Playback

**User Story:** As a user, I want to listen to a dynamic conversation between historical personas, so that I can experience the emotional and ideological dimensions of a historical event.

#### Acceptance Criteria

1. WHEN a user starts a Session, THE Platform SHALL begin audio playback of the Dialogue within 3 seconds of the user's action.
2. WHILE a Session is active, THE Platform SHALL display the name and role of the currently speaking Persona alongside a visual speaking indicator.
3. WHILE a Session is active, THE Platform SHALL display a scrolling transcript of all Dialogue turns, attributing each turn to the correct Persona.
4. THE Platform SHALL generate Dialogue turns that are contextually consistent with the Scenario's historical period, the speaking Persona's personality, and the preceding turns in the conversation.
5. WHEN one Persona finishes speaking, THE Platform SHALL begin the next Persona's turn within 1 second, maintaining conversational flow.
6. THE Platform SHALL support Dialogue sessions of at least 20 turns before requiring user interaction to continue.
7. WHEN a user pauses a Session, THE Platform SHALL stop audio playback immediately and preserve the current Dialogue position.
8. WHEN a user resumes a paused Session, THE Platform SHALL resume audio playback from the preserved Dialogue position within 1 second.

---

### Requirement 5: User Interruption

**User Story:** As a user, I want to interrupt the conversation at any time to ask a question, share an opinion, or redirect the discussion, so that I can actively shape the historical dialogue rather than just observe it.

#### Acceptance Criteria

1. WHILE a Session is active, THE Platform SHALL provide a clearly visible interruption control that the user can activate at any time.
2. WHEN a user activates the interruption control, THE Platform SHALL pause the current Dialogue turn immediately and open an input interface for the user's message.
3. THE Platform SHALL accept user interruption input as typed text of between 1 and 1000 characters.
4. WHEN a user submits an interruption, THE Convex Backend SHALL incorporate the user's message into the Dialogue context and generate a Persona response that directly addresses the user's input within 5 seconds.
5. WHEN a Persona responds to a user interruption, THE Voice Engine SHALL synthesise the response using the responding Persona's assigned voice.
6. AFTER a Persona responds to a user interruption, THE Platform SHALL resume the Dialogue in a direction influenced by the user's input.
7. IF a user submits an interruption containing fewer than 1 character, THEN THE Platform SHALL display a validation error and SHALL NOT submit the interruption to the Convex Backend.
8. THE Platform SHALL include all user interruptions and Persona responses in the Session transcript, clearly labelled with the source (user or Persona name).

---

### Requirement 6: Voice Input for Interruptions

**User Story:** As a user, I want to speak my interruption aloud rather than type it, so that the interaction feels natural and immersive.

#### Acceptance Criteria

1. WHERE the user's browser supports the Web Speech API or ElevenLabs speech-to-text, THE Platform SHALL provide a voice input option alongside the text input in the interruption interface.
2. WHEN a user activates voice input, THE Platform SHALL begin capturing audio from the user's microphone and display a recording indicator.
3. WHEN a user stops voice input, THE Platform SHALL transcribe the captured audio to text and populate the interruption text field with the transcription within 3 seconds.
4. IF the transcription service returns an error, THEN THE Platform SHALL display an error message and retain the text input field so the user can type their interruption manually.
5. WHEN a user activates voice input, THE Platform SHALL request microphone permission if it has not already been granted, and SHALL display a clear explanation of why the permission is needed.
6. IF the user denies microphone permission, THEN THE Platform SHALL disable the voice input option and display a message explaining that voice input requires microphone access.

---

### Requirement 7: Session History and Persistence

**User Story:** As a user, I want my past sessions to be saved, so that I can revisit conversations and continue where I left off.

#### Acceptance Criteria

1. THE Convex Backend SHALL persist each Session, including the Scenario reference, all Dialogue turns, all user interruptions, and the Session status (active, paused, completed).
2. WHEN a user returns to the Platform, THE Platform SHALL display a list of the user's past Sessions, ordered by most recent activity, showing the Scenario title and the date of last activity.
3. WHEN a user selects a past Session from the history list, THE Platform SHALL restore the Session to its last saved state and allow the user to resume or review it.
4. THE Convex Backend SHALL save the Session state after every Dialogue turn so that no more than one turn of progress is lost in the event of a connection interruption.
5. WHEN a user explicitly ends a Session, THE Platform SHALL mark the Session as completed and SHALL NOT allow further Dialogue turns to be added to it.

---

### Requirement 8: Scenario and Persona Content Quality

**User Story:** As a user, I want the AI-generated content to be historically grounded and emotionally authentic, so that the experience is both educational and engaging.

#### Acceptance Criteria

1. THE Convex Backend SHALL generate Persona backstories and Dialogue turns using source material that references documented historical events, figures, or contexts relevant to the Scenario.
2. THE Platform SHALL include a content disclaimer on each Scenario page stating that Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.
3. WHEN generating a Dialogue turn, THE Convex Backend SHALL maintain consistency with the Persona's previously established personality traits, emotional state, and speaking style throughout the Session.
4. THE Convex Backend SHALL generate Dialogue turns that reflect the historical period's language register (formal, colloquial, regional) as defined in the Persona's speaking style description.
5. IF a generated Dialogue turn contradicts a Persona's established personality traits, THEN THE Convex Backend SHALL regenerate the turn before delivering it to the Platform.

---

### Requirement 9: Accessibility

**User Story:** As a user with hearing or motor impairments, I want the platform to be accessible, so that I can fully participate in the experience regardless of my abilities.

#### Acceptance Criteria

1. THE Platform SHALL provide a full text transcript of all Dialogue turns and user interruptions, visible and scrollable at all times during a Session.
2. THE Platform SHALL ensure all interactive controls (play, pause, interrupt, submit) are operable via keyboard navigation alone.
3. THE Platform SHALL provide ARIA labels for all interactive controls and dynamic content regions so that screen readers can announce state changes.
4. THE Platform SHALL maintain a colour contrast ratio of at least 4.5:1 between text and background colours for all body text, in compliance with WCAG 2.1 Level AA.
5. WHEN the speaking Persona changes, THE Platform SHALL update the transcript and the speaking indicator simultaneously so that users relying on visual cues receive the same information as users relying on audio.

---

### Requirement 10: Performance and Reliability

**User Story:** As a user, I want the platform to be fast and reliable, so that immersion is not broken by delays or errors.

#### Acceptance Criteria

1. THE Platform SHALL load the home page, including the Scenario library, within 3 seconds on a connection with a minimum download speed of 10 Mbps.
2. WHEN a Session is active, THE Platform SHALL buffer at least one Dialogue turn of synthesised audio ahead of playback to minimise gaps between turns.
3. IF the connection between the Platform and the Convex Backend is interrupted during a Session, THEN THE Platform SHALL display a reconnection indicator and SHALL attempt to reconnect automatically at intervals of 5 seconds for up to 60 seconds.
4. IF the Platform fails to reconnect within 60 seconds, THEN THE Platform SHALL display an error message and preserve the Session transcript so the user does not lose their conversation history.
5. THE Voice Engine SHALL synthesise a single Dialogue turn of up to 200 words within 4 seconds under normal operating conditions.

---

### Requirement 11: User Authentication and Profiles

**User Story:** As a user, I want to create an account and log in, so that my sessions, generated scenarios, and preferences are saved to my profile.

#### Acceptance Criteria

1. THE Platform SHALL provide user registration and login using email and password only, powered by Convex Auth.
2. WHEN a user registers with an email and password, THE Platform SHALL enforce a minimum password length of 8 characters and require at least one uppercase letter, one lowercase letter, and one digit.
3. WHEN a user logs in successfully, THE Platform SHALL associate all subsequent Sessions and generated Scenarios with the user's account.
4. WHEN an unauthenticated user attempts to start a Session or generate a Scenario, THE Platform SHALL prompt the user to log in or register before proceeding.
5. THE Platform SHALL allow a user to delete their account, and WHEN a user deletes their account, THE Convex Backend SHALL permanently remove all associated Sessions, Scenarios, and personal data within 30 days.

---

### Requirement 12: Round-Trip Dialogue Serialisation

**User Story:** As a developer, I want Dialogue state to serialise and deserialise correctly, so that Sessions can be persisted and restored without data loss.

#### Acceptance Criteria

1. THE Convex Backend SHALL serialise each Dialogue turn into a structured JSON document containing the Persona ID, turn index, text content, audio URL, and timestamp.
2. WHEN a serialised Dialogue turn is deserialised, THE Convex Backend SHALL produce a Dialogue turn object that is equivalent to the original in all fields.
3. FOR ALL valid Dialogue turn objects, serialising then deserialising then serialising SHALL produce an identical JSON document (round-trip property).
4. IF a serialised Dialogue turn document is missing a required field, THEN THE Convex Backend SHALL return a descriptive validation error and SHALL NOT persist the incomplete document.
