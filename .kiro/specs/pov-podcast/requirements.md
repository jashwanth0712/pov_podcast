# Requirements Document

## Introduction

POV Podcast is an AI-powered interactive podcast platform that recreates major historical events through multi-perspective conversations. Rather than presenting facts, the platform immerses users in the emotional experience of history — how it felt, what people believed, and why decisions were made. Each participant in a conversation is a distinct historical persona with a unique AI-generated voice (powered by ElevenLabs), personality, and emotional narrative. Users can listen passively or interrupt at any time to ask questions, share opinions, or steer the discussion. The platform ships with 12 pre-built historical scenarios spanning the Modern and Contemporary eras, and allows users to generate entirely new ones.

The system is built on a Next.js frontend, a Convex backend (which handles both data storage and authentication via Convex Auth, and acts as the agent orchestrator), OpenRouter (which routes all AI text generation requests to open-source language models), and the ElevenLabs API for text-to-speech streaming and speech-to-text transcription only.

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
- **Moderator**: A special meta-Persona present in every Session whose role is to manage conversational flow, introduce new angles, and break deadlocks. The Moderator does not hold a historical point-of-view and is represented by a styled icon avatar and a neutral voice.
- **Persona Agent**: The individual AI agent that represents a single Persona, possessing its own system prompt, context window, conversation history, and backstory.
- **Dialogue Branch**: A divergent path of conversation created when a user interruption causes the Dialogue to fork from its prior trajectory; the original path is preserved and the new path continues from the fork point.
- **Fork Point**: The specific Dialogue turn index at which a user interruption caused a Dialogue Branch to be created.
- **Turn-Taking Mode**: The rule currently governing which Persona speaks next; one of Relevance, Round Robin, or Random.
- **Orchestrator**: The AI subsystem that evaluates Persona states and determines the next speaker when Turn-Taking Mode is set to Relevance.
- **Article Reference**: A URL and title of a real internet article or primary source that a Persona Agent cites as relevant to the Scenario.
- **Conversation Tree**: The complete graph of all Dialogue Branches and Fork Points within a Session, representing every path the conversation has taken or could take.
- **Calibration Persona**: A neutral guide character that asks the user questions at Session start to recommend an appropriate depth level.
- **Depth Level**: A setting that controls the complexity, vocabulary, and analytical density of Persona Agent dialogue; one of Casual, Intermediate, or Scholar.
- **Emotional State Object**: A structured data record maintained per Persona Agent containing the current mood, conviction level, and willingness to concede, updated after each Dialogue turn.
- **Source Map**: A visual display in the Session interface showing all Article References surfaced during the Session, grouped by the Persona that cited them and annotated with ideological alignment.
- **Relationship Map**: A visual display in the Session interface showing all Personas as nodes and their pairwise relationships as labelled edges.
- **Context Compaction**: The process of summarising a Persona Agent's conversation history when it reaches 20 messages, replacing the raw message history with a compressed summary to prevent context window overflow.
- **Branch Pruning**: The automatic deletion of Dialogue Branches that the user has abandoned (created but never resumed), keeping only active main branches in persistent storage.
- **Voice Matching**: The automated process of selecting the most appropriate ElevenLabs voice ID for a Persona based on the Persona's geographic/cultural origin, estimated age, gender, and other relevant attributes.
- **OpenRouter**: The LLM API gateway used by the Convex Backend to route text generation requests to open-source language models.
- **Audio Stream**: The real-time audio data delivered to the frontend via ElevenLabs TTS WebSocket streaming, allowing playback to begin before the full audio is synthesised.

---

## Requirements

### Requirement 1: Scenario Library

**User Story:** As a user, I want to browse a curated library of pre-built historical scenarios, so that I can quickly start an immersive podcast session without having to create one myself.

#### Acceptance Criteria

1. THE Platform SHALL display a Scenario library containing exactly 12 pre-built Scenarios on the home page. The 12 pre-built Scenarios are:
   1. World War II (1939–1945) — Era: Modern
   2. India–Pakistan Partition (1947) — Era: Modern
   3. Moon Landing (1969) — Era: Contemporary
   4. Titanic Sinking (1912) — Era: Modern
   5. Hiroshima Atomic Bombing (1945) — Era: Modern
   6. COVID-19 Pandemic (2020–2021) — Era: Contemporary
   7. Stanford Prison Experiment (1971) — Era: Contemporary
   8. Jack the Ripper Murders (1888) — Era: Modern
   9. Bhopal Gas Tragedy (1984) — Era: Contemporary
   10. Assassination of Osama bin Laden (2011) — Era: Contemporary
   11. Kargil War (1999) — Era: Contemporary
   12. Chernobyl Disaster (1986) — Era: Contemporary

2. Each pre-built Scenario SHALL include the following specific Personas as defined in the curated catalogue:

   **1. World War II (1939–1945)**
   - Front-line Soldier (Allied)
   - Front-line Soldier (Axis)
   - Military Commander
   - Field Nurse / Woman on the Home Front
   - Jewish Civilian in Occupied Europe
   - War Correspondent / Journalist

   **2. India–Pakistan Partition (1947)**
   - Hindu Refugee fleeing to India
   - Muslim Refugee fleeing to Pakistan
   - British Colonial Administrator
   - Sikh Community Leader
   - Woman who lost her family in the violence
   - Local Politician / Independence Movement Leader

   **3. Moon Landing (1969)**
   - Apollo 11 Astronaut (Neil Armstrong / Buzz Aldrin perspective)
   - Mission Control Flight Director
   - NASA Engineer who built the spacecraft
   - Soviet Space Program Scientist
   - American Citizen watching on TV
   - Journalist covering the event

   **4. Titanic Sinking (1912)**
   - Ship's Captain (Edward Smith)
   - Chief Engineer who built / maintained the ship
   - First-Class Passenger
   - Third-Class Passenger (immigrant)
   - Female Passenger / Survivor
   - Crew Member (deck hand or steward)

   **5. Hiroshima Atomic Bombing (1945)**
   - Hiroshima Survivor (Hibakusha)
   - Relative of someone killed in the blast
   - American Pilot (Enola Gay crew)
   - American Military Commander who ordered the bombing
   - Japanese Doctor / Rescue Worker
   - International Observer / Journalist

   **6. COVID-19 Pandemic (2020–2021)**
   - ICU Doctor / Nurse on the front line
   - Government Health Official / Politician
   - Middle-Class Professional working from home
   - Small Business Owner facing closure
   - Daily Wage Worker who lost their income
   - Vaccine Scientist / Researcher

   **7. Stanford Prison Experiment (1971)**
   - Prisoner participant
   - Guard participant
   - Lead Researcher (Philip Zimbardo)
   - Outside Observer / Ethics Reviewer
   - Participant who broke down / suffered psychological harm
   - Journalist who later investigated the experiment

   **8. Jack the Ripper Murders (1888)**
   - Metropolitan Police Detective
   - Victim's Family Member
   - East End Resident / Local Witness
   - Journalist covering the case for a newspaper
   - Suspect (unnamed, representing the theories)
   - Coroner / Medical Examiner

   **9. Bhopal Gas Tragedy (1984)**
   - Union Carbide Factory Worker
   - Bhopal Resident / Survivor
   - Rescue Worker / First Responder
   - Investigative Journalist
   - Doctor treating victims
   - Union Carbide Executive / Corporate Representative

   **10. Assassination of Osama bin Laden (2011)**
   - US Navy SEAL involved in the operation
   - CIA Intelligence Analyst who tracked bin Laden
   - Pakistani Resident near the Abbottabad compound
   - American Politician / Government Official
   - Journalist breaking the news
   - Al-Qaeda Associate / Ideological Follower

   **11. Kargil War (1999)**
   - Indian Army Soldier on the front line
   - Pakistani Army Soldier / Military Commander
   - Indian Politician / Defence Minister
   - Pakistani Politician / Government Official
   - War Journalist embedded with troops
   - Family Member of a soldier killed in action

   **12. Chernobyl Disaster (1986)**
   - Nuclear Plant Operator / Worker on duty during the explosion
   - Soviet Government Official managing the cover-up
   - Nuclear Scientist assessing the damage
   - Liquidator (cleanup worker sent into the exclusion zone)
   - Local Resident / Evacuee from Pripyat
   - International Nuclear Safety Observer

3. WHEN a user opens the Scenario library, THE Platform SHALL present each Scenario with a title, a time period, a brief description (maximum 200 characters), and a list of featured Persona names.
4. WHEN a user selects a Scenario from the library, THE Platform SHALL navigate the user to the Session setup page for that Scenario within 500ms.
5. THE Platform SHALL categorise Scenarios by historical era (e.g., Ancient, Medieval, Modern, Contemporary) and allow the user to filter by era.
6. WHEN a user applies an era filter, THE Platform SHALL update the displayed Scenario list to show only matching Scenarios within 300ms.

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
7. THE Scenario Generator SHALL generate a maximum of 6 Personas per Scenario to ensure manageable turn-taking, relationship mapping, and LLM call volume per turn.

---

### Requirement 3: Persona Definition and Agent Architecture

**User Story:** As a user, I want each historical persona to be a fully realised individual agent with its own voice, memory, and perspective, so that I can tell the participants apart and feel the authentic emotional weight of their lived experience.

#### Acceptance Criteria

1. THE Scenario Generator SHALL assign each Persona an ElevenLabs voice ID selected by Voice Matching, choosing the closest available voice from the full ElevenLabs voice pool based on the Persona's geographic/cultural origin, estimated age, gender, and other relevant persona attributes. Voice IDs are not required to be unique across Scenarios.
2. WHEN a Session begins, THE Voice Engine SHALL synthesise each Persona's speech using the voice ID assigned to that Persona.
3. THE Convex Backend SHALL instantiate each Persona as a distinct Persona Agent with its own AI system prompt, its own context window, and its own conversation history that is not shared with other Persona Agents.
4. THE Convex Backend SHALL generate a unique system prompt for each Persona Agent that encodes the Persona's name, historical role, personality traits (minimum three), emotional backstory (minimum 200 words), speaking style, ideological position, and a list of at least three Article References relevant to the Scenario.
5. WHEN a Persona Agent generates a Dialogue turn, THE Convex Backend SHALL include in that Persona Agent's context window both the full shared conversation log (all Personas' turns with names attributed) and the Persona Agent's private system prompt and backstory, so that the agent has full conversational coherence while maintaining its unique perspective.
6. WHEN a Persona speaks, THE Voice Engine SHALL apply voice settings (stability, similarity boost, style) that reflect the Persona's defined speaking style.
7. THE Platform SHALL display each Persona's name, role, and a brief personality summary in the Session interface so the user can identify who is speaking.
8. IF the Voice Engine returns an error for a Persona's speech synthesis request, THEN THE Platform SHALL retry the request once and, if the retry fails, SHALL display a text transcript of the Persona's turn in place of audio.
9. THE LLM model used for all Persona Agent text generation SHALL be hardcoded via OpenRouter and SHALL NOT be configurable by the user.

---

### Requirement 4: Session Playback and Branching Dialogue

**User Story:** As a user, I want to listen to a dynamic, branching conversation between historical personas, so that I can experience the emotional and ideological dimensions of a historical event and shape its direction.

#### Acceptance Criteria

1. WHEN a user starts a Session, THE Platform SHALL begin audio playback of the first received Audio Stream chunk within 3 seconds of the user's action, without waiting for full audio synthesis to complete.
2. WHILE a Session is active, THE Platform SHALL display the name and role of the currently speaking Persona alongside a visual speaking indicator.
3. WHILE a Session is active, THE Platform SHALL display a scrolling transcript of all Dialogue turns on the current Dialogue Branch, attributing each turn to the correct Persona.
4. THE Convex Backend SHALL pre-generate the text of between two and four Dialogue turns ahead of the current playback position via OpenRouter while the current turn's Audio Stream is playing, so that text is ready for TTS synthesis without perceptible delay.
5. WHEN one Persona finishes speaking, THE Platform SHALL begin the next Persona's turn within 1 second, maintaining conversational flow.
6. THE Platform SHALL support Dialogue sessions of at least 20 turns before requiring user interaction to continue.
7. WHEN a user pauses a Session, THE Platform SHALL stop audio playback immediately and preserve the current Dialogue position on the current Dialogue Branch.
8. WHEN a user resumes a paused Session, THE Platform SHALL resume audio playback from the preserved Dialogue position within 1 second.
9. WHEN a Dialogue Branch is created, THE Convex Backend SHALL preserve the original Dialogue Branch in its entirety and begin generating new turns from the Fork Point on the new branch.
10. THE Platform SHALL display a visual branch indicator in the transcript so the user can see where the Dialogue forked and navigate between branches.

---

### Requirement 5: User Interruption and Dialogue Forking

**User Story:** As a user, I want to interrupt the conversation at any time to ask a question, share an opinion, or redirect the discussion, so that I can actively shape the historical dialogue and create a new branch of conversation from my point of intervention.

#### Acceptance Criteria

1. WHILE a Session is active, THE Platform SHALL provide a clearly visible interruption control that the user can activate at any time.
2. WHEN a user activates the interruption control, THE Platform SHALL pause the current Dialogue turn immediately and open an input interface for the user's message.
3. THE Platform SHALL accept user interruption input as typed text of between 1 and 1000 characters.
4. WHEN a user submits an interruption, THE Convex Backend SHALL record the current turn index as the Fork Point, preserve the existing Dialogue Branch, and create a new Dialogue Branch starting from the Fork Point.
5. WHEN a new Dialogue Branch is created from a user interruption, THE Convex Backend SHALL incorporate the user's message into the new branch's context and generate a Persona response that directly addresses the user's input within 5 seconds.
6. WHEN a Persona responds to a user interruption, THE Voice Engine SHALL synthesise the response using the responding Persona's assigned voice.
7. AFTER a Persona responds to a user interruption on the new Dialogue Branch, THE Convex Backend SHALL continue generating turns on the new branch in a direction influenced by the user's input.
8. IF a user submits an interruption containing fewer than 1 character, THEN THE Platform SHALL display a validation error and SHALL NOT submit the interruption to the Convex Backend.
9. THE Platform SHALL include all user interruptions and Persona responses in the Session transcript on the active Dialogue Branch, clearly labelled with the source (user or Persona name).
10. THE Platform SHALL allow the user to navigate back to any previously preserved Dialogue Branch and resume playback from that branch's last position.

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
6. THE Convex Backend SHALL attempt a maximum of 2 regeneration attempts per Dialogue turn. IF both attempts fail quality validation, THEN THE Convex Backend SHALL deliver the second attempt's output to the Platform with a quality warning flag, and SHALL NOT block session progression.

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
6. THE Platform SHALL provide a "Forgot Password" flow that sends a password reset link to the user's registered email address, powered by Convex Auth. WHEN a user clicks the reset link, THE Platform SHALL allow the user to set a new password that meets the same complexity requirements as registration.

---

### Requirement 12: Round-Trip Dialogue Serialisation

**User Story:** As a developer, I want Dialogue state to serialise and deserialise correctly, so that Sessions can be persisted and restored without data loss.

#### Acceptance Criteria

1. THE Convex Backend SHALL serialise each Dialogue turn into a structured JSON document containing the Persona ID, turn index, text content, audio URL, and timestamp.
2. WHEN a serialised Dialogue turn is deserialised, THE Convex Backend SHALL produce a Dialogue turn object that is equivalent to the original in all fields.
3. FOR ALL valid Dialogue turn objects, serialising then deserialising then serialising SHALL produce an identical JSON document (round-trip property).
4. IF a serialised Dialogue turn document is missing a required field, THEN THE Convex Backend SHALL return a descriptive validation error and SHALL NOT persist the incomplete document.

---

### Requirement 13: Article Cross-Referencing

**User Story:** As a user, I want personas to cite real sources and surface relevant article links during the conversation, so that I can explore the historical record behind each perspective.

#### Acceptance Criteria

1. THE Convex Backend SHALL associate each Persona Agent with at least three Article References (URL and title) sourced from publicly accessible internet articles, primary sources, or reputable historical records relevant to the Scenario.
2. WHEN a Persona Agent generates a Dialogue turn that draws on a fact, event, or claim supported by one of its Article References, THE Convex Backend SHALL attach the relevant Article Reference metadata to that Dialogue turn.
3. WHEN a Dialogue turn with an attached Article Reference is delivered to the Platform, THE Platform SHALL surface the Article Reference to the user as an inline citation or a non-blocking pop-up within the transcript.
4. THE Platform SHALL display each Article Reference with its title and a clickable URL that opens the source in a new browser tab.
5. THE Platform SHALL collect all Article References surfaced during a Session and display them in a deduplicated reference list accessible from the Session interface.
6. IF an Article Reference URL is unreachable at the time of display, THEN THE Platform SHALL still display the article title and URL without attempting to preview the content, and SHALL NOT suppress the citation.
7. THE Convex Backend SHALL generate Article References that are plausibly real and historically relevant; WHERE a Scenario is fictional or speculative, THE Convex Backend SHALL clearly label Article References as illustrative rather than verified.
8. WHEN the Convex Backend generates Article References, THE Convex Backend SHALL attempt to validate that each URL is reachable before storing it. IF a URL is unreachable at generation time, THEN THE Convex Backend SHALL flag it as unverified in the stored record.

---

### Requirement 14: Turn-Taking Modes

**User Story:** As a user, I want to control how the conversation flows between personas, so that I can shape the pacing and focus of the discussion to match my interests.

#### Acceptance Criteria

1. THE Platform SHALL support three Turn-Taking Modes: Relevance, Round Robin, and Random.
2. WHEN Turn-Taking Mode is set to Relevance, THE Orchestrator SHALL evaluate all Persona Agents after each Dialogue turn and select the next speaker as the Persona whose current emotional state and ideological position make it most relevant to respond to the preceding turn.
3. WHEN Turn-Taking Mode is set to Round Robin, THE Platform SHALL cycle through all Personas in a fixed sequence, giving each Persona one turn before repeating the cycle.
4. WHEN Turn-Taking Mode is set to Random, THE Platform SHALL select the next speaker by random draw from all Personas in the Session, with no Persona speaking twice in a row.
5. THE Platform SHALL display the current Turn-Taking Mode prominently in the Session interface and allow the user to switch modes at any time during a Session.
6. WHEN a user switches Turn-Taking Mode during a Session, THE Platform SHALL apply the new mode starting from the next Dialogue turn without interrupting the turn currently in progress.
7. WHILE a Session is active, THE Platform SHALL allow the user to force a specific Persona to speak next, overriding the current Turn-Taking Mode for that single turn only, after which the active mode resumes.
8. WHEN a user forces a specific Persona to speak, THE Convex Backend SHALL generate that Persona's turn within 5 seconds and deliver it as the next Dialogue turn on the active Dialogue Branch.
9. WHEN a user activates the interruption control to speak themselves, THE Platform SHALL treat the user's input as the highest-priority event, suspending the current Turn-Taking Mode until the interruption sequence is complete, after which the active mode resumes.
10. THE Platform SHALL default to Relevance mode when a new Session begins.

---

### Requirement 15: Emotional and Ideological Expression

**User Story:** As a user, I want each persona to express genuine emotion, personal struggle, and ideological conviction in every turn, so that the conversation feels like a real human exchange rather than a neutral recitation of facts.

#### Acceptance Criteria

1. THE Convex Backend SHALL include in each Persona Agent's system prompt an explicit instruction to express the Persona's current emotional state, personal lived experience, and ideological position in every Dialogue turn it generates.
2. WHEN a Persona Agent generates a Dialogue turn, THE Convex Backend SHALL evaluate whether the turn contains at least one of the following expressive elements: an emotional statement, a reference to a personal struggle, or an ideological assertion; IF none are present, THEN THE Convex Backend SHALL regenerate the turn before delivering it to the Platform.
3. THE Convex Backend SHALL maintain an emotional state model for each Persona Agent that evolves across Dialogue turns, reflecting how the conversation and other Personas' statements affect that Persona's mood and conviction.
4. WHEN a Persona Agent's emotional state changes significantly between turns, THE Convex Backend SHALL reflect that change in the Persona's language register, word choice, and speaking intensity in the generated Dialogue turn.
5. THE Convex Backend SHALL generate Dialogue turns that surface ideological conflicts between Personas by having Personas directly challenge, question, or rebut each other's stated positions.
6. WHEN two Personas hold opposing ideological positions on a topic raised in the Dialogue, THE Orchestrator SHALL, in Relevance mode, prioritise selecting one of those Personas as the next speaker to sustain the ideological tension.
7. THE Platform SHALL display a brief emotional state indicator (e.g., a label or icon) alongside each Persona's name in the transcript so the user can track how each Persona is feeling as the conversation progresses.
8. IF a generated Dialogue turn is factually inconsistent with the Persona's established backstory or ideological position, THEN THE Convex Backend SHALL regenerate the turn before delivering it to the Platform.

---

### Requirement 16: Conversation Tree Model

**User Story:** As a user, I want to navigate a persistent conversation tree with all my branches and fork points, so that I can rewind to any earlier decision point, try a different interruption, and explore alternative paths without losing prior work.

#### Acceptance Criteria

1. WHEN a user forks the Dialogue, THE Convex Backend SHALL include the complete prior conversation history up to the Fork Point in every Persona Agent's context window on the new branch, so that all Persona Agents retain full memory of the original timeline.
2. WHEN a user selects a Fork Point in the conversation tree, THE Platform SHALL allow the user to create a new Dialogue Branch from that Fork Point, independent of any branches already created from the same point.
3. THE Platform SHALL display a visual conversation tree in the Session interface showing all Dialogue Branches, all Fork Points, and the user's current position within the tree.
4. WHEN a user selects any branch in the conversation tree, THE Platform SHALL navigate to that branch and resume playback or review from the last position on that branch within 500ms.
5. THE Convex Backend SHALL persist the full conversation tree for each Session, including all Dialogue Branches, all Fork Points, and all Dialogue turns on every branch, so that the tree is fully restorable across sessions.
6. THE Convex Backend SHALL automatically prune Dialogue Branches that the user has not navigated to or continued within a Session. Only branches that the user has actively resumed or is currently on SHALL be retained in persistent storage.
7. WHEN a Dialogue Branch is pruned, THE Convex Backend SHALL delete all associated Dialogue turns, audio URLs, and Persona Agent emotional state snapshots for that branch.

---

### Requirement 17: Conflict Resolution and Deadlock Handling

**User Story:** As a user, I want the conversation to stay dynamic and progressive, so that I am never stuck listening to personas repeat the same arguments in a loop.

#### Acceptance Criteria

1. WHEN the Orchestrator detects that two or more Persona Agents have restated the same positions across three or more consecutive Dialogue turns without measurable progression, THE Orchestrator SHALL classify the exchange as a deadlock.
2. WHEN a deadlock is classified, THE Platform SHALL execute an escalation mechanism: either THE Moderator Persona SHALL generate a turn that redirects the conversation to a new angle, or THE Orchestrator SHALL inject a topic nudge containing a new piece of evidence or a reframing question into the active branch's context.
3. THE Platform SHALL include a Moderator Persona in every Session whose sole role is to manage conversational flow, introduce new angles, and break deadlocks; THE Moderator Persona SHALL NOT hold a historical point-of-view of its own.
4. WHEN a user manually triggers the Moderator, THE Platform SHALL immediately generate a Moderator turn on the active Dialogue Branch within 5 seconds, regardless of the current Turn-Taking Mode.
5. THE Convex Backend SHALL log each deadlock event, recording the Session ID, the branch index, the turn index at which the deadlock was detected, and the escalation action taken.
6. THE Moderator Persona SHALL be assigned a neutral ElevenLabs voice that is distinct from all Persona voices in the Session.
7. THE Moderator Persona SHALL be represented in the Session UI by a styled icon avatar (not an AI-generated portrait) and SHALL be clearly labelled as "Moderator" so the user understands it is a session management role, not a historical participant.

---

### Requirement 18: Source Credibility and Bias Transparency

**User Story:** As a user, I want to understand the ideological perspective behind every source a persona cites, so that I can critically evaluate the evidence rather than accepting it as objective truth.

#### Acceptance Criteria

1. THE Convex Backend SHALL source each Persona Agent's Article References from publications and records that align with that Persona's defined ideological position, so that a conservative Persona cites conservative-leaning sources and a revolutionary Persona cites revolutionary-leaning sources.
2. WHEN an Article Reference is surfaced in the Platform UI, THE Platform SHALL display a bias label in the format "Cited by [Persona Name] — reflects their perspective" adjacent to the citation.
3. THE Platform SHALL never present a Persona-cited Article Reference without the Persona attribution label defined in criterion 2.
4. THE Platform SHALL provide a source map view accessible from the Session interface that displays all Article References surfaced during the Session, grouped by the Persona that cited them, and annotated with the ideological alignment of each source relative to the other sources in the map.
5. WHEN a user selects an Article Reference in the source map or transcript, THE Platform SHALL display a brief explanation, generated by the citing Persona Agent, of why that Persona cited that source and how it supports the Persona's position.

---

### Requirement 19: Audience Calibration

**User Story:** As a user, I want to choose the depth and complexity of the conversation, so that the experience matches my background knowledge and learning goals.

#### Acceptance Criteria

1. THE Platform SHALL support three depth levels: Casual (accessible language and emotional storytelling), Intermediate (historical context with analytical commentary), and Scholar (deep ideological and historiographical analysis with dense historical references).
2. WHEN a user starts a new Session, THE Platform SHALL prompt the user to select a depth level before the first Dialogue turn is generated.
3. WHEN a user changes the depth level during an active Session, THE Persona Agents SHALL adjust their language register, vocabulary complexity, and density of historical references starting from the next generated Dialogue turn.
4. WHERE a Calibration Persona is enabled for a Session, THE Platform SHALL present the user with a short sequence of questions at Session start and SHALL recommend a depth level based on the user's responses before the first Dialogue turn is generated.
5. THE Convex Backend SHALL persist the selected depth level per user account and SHALL apply the stored depth level as the default selection when that user starts a new Session.

---

### Requirement 20: Persona Relationship Dynamics

**User Story:** As a user, I want the personas to interact with each other according to their real historical relationships, so that alliances, rivalries, and ideological bonds shape the tone and direction of the conversation.

#### Acceptance Criteria

1. THE Convex Backend SHALL define, for each Scenario, explicit pairwise relationships between every Persona pair, classifying each relationship as one of: alliance, rivalry, mentor/student, ideological kinship, or historical enmity.
2. THE Convex Backend SHALL encode each Persona's relationships with all other Personas in that Persona Agent's system prompt, including the other Persona's name and the relationship type.
3. WHEN Turn-Taking Mode is set to Relevance, THE Orchestrator SHALL factor in relationship dynamics when scoring Persona Agents for next-speaker selection, increasing the score of a rival Persona when the preceding turn contained a direct challenge and increasing the score of an allied Persona when the preceding turn contained a supportive statement.
4. THE Platform SHALL display a relationship map in the Session interface showing all Personas as nodes and all pairwise relationships as labelled edges, accessible at any time during a Session.
5. WHEN a Persona Agent generates a Dialogue turn that directly addresses another Persona by name, THE Convex Backend SHALL apply a tone modifier to the generation prompt that reflects the relationship type between the two Personas, so that a rival's rebuttal is sharper in register than a neutral peer's response.

---

### Requirement 21: Persistent Emotional State Tracking

**User Story:** As a user, I want to see each persona's emotional state evolve in real time and have that state influence their voice and language, so that the conversation feels psychologically authentic and emotionally coherent across the entire session.

#### Acceptance Criteria

1. THE Convex Backend SHALL maintain a persistent emotional state object for each Persona Agent that evolves across all Dialogue turns in a Session, including across Dialogue Branches.
2. THE emotional state object SHALL include at minimum: current mood (one of: calm, frustrated, passionate, defensive, or resigned), conviction level (a numeric value representing how strongly the Persona holds its position), and willingness to concede (a numeric value representing the Persona's openness to changing its position).
3. WHEN a Persona Agent is interrupted, directly challenged, or contradicted by another Persona or by the user, THE Convex Backend SHALL update that Persona Agent's emotional state object to reflect the impact, increasing frustration or hardening conviction as appropriate to the content of the challenge.
4. WHEN a Persona Agent generates a Dialogue turn, THE Convex Backend SHALL apply the Persona's current emotional state to the generation prompt so that the turn's language register, word choice, and intensity reflect the current mood, conviction level, and willingness to concede.
5. WHEN a Persona Agent's emotional state is applied to a Dialogue turn, THE Voice Engine SHALL use the emotional state values to set the ElevenLabs voice parameters (stability, similarity_boost, and style) for that turn's speech synthesis, so that a frustrated Persona sounds more agitated and a resigned Persona sounds more subdued.
6. WHEN Turn-Taking Mode is set to Relevance, THE Orchestrator SHALL incorporate each Persona Agent's current emotional state values into the relevance scoring used to select the next speaker.
7. THE Platform SHALL display a live emotional state indicator for each Persona in the Session interface, showing at minimum the current mood label or icon adjacent to the Persona's name, and SHALL update the indicator after each Dialogue turn.
8. THE Convex Backend SHALL persist the emotional state of every Persona Agent at every Fork Point, so that WHEN a user rewinds to a Fork Point, THE Convex Backend SHALL restore all Persona Agents' emotional states to the values recorded at that Fork Point.
9. WHEN a Persona Agent generates a Dialogue turn, the Depth Level setting SHALL govern vocabulary complexity and analytical density, while the Emotional State SHALL govern tone, intensity, and language register. Both SHALL be applied simultaneously and SHALL NOT override each other.

---

### Requirement 22: AI-Generated Persona Avatars

**User Story:** As a user, I want each persona to have a visually distinct AI-generated avatar, so that I can immediately recognise who is speaking and feel more immersed in the historical characters.

#### Acceptance Criteria

1. THE Platform SHALL generate two avatar images per Persona using the Gemini model via the RunPod API: an animated profile picture for use in the conversation UI and a full portrait image for use on Scenario and Persona detail pages.
2. WHEN a new Persona is created, whether from a pre-built Scenario or from the Scenario Generator, THE Convex Backend SHALL automatically trigger avatar generation using the Persona's name, historical role, physical description, personality traits, and era as generation inputs.
3. WHEN avatar generation completes successfully, THE Convex Backend SHALL store the generated image URLs in the Persona's data record in Convex.
4. THE Platform SHALL display the animated profile picture adjacent to the Persona's name in the Session transcript and speaking indicator during an active Session.
5. IF avatar generation fails, THEN THE Platform SHALL display a styled text-based fallback avatar using the Persona's initials or a role-based icon in place of the generated image, and THE Convex Backend SHALL schedule a background retry of the avatar generation request.
6. THE Platform SHALL read the RunPod API endpoint URL and the Gemini model identifier from environment variables, so that both values are configurable without a code change.

---

### Requirement 23: Context Compaction

**User Story:** As a developer, I want persona agent context windows to be automatically compacted, so that long sessions remain coherent without exceeding LLM context limits.

#### Acceptance Criteria

1. THE Convex Backend SHALL track the number of messages in each Persona Agent's active context window.
2. WHEN a Persona Agent's context window reaches 20 messages, THE Convex Backend SHALL trigger Context Compaction for that agent.
3. WHEN Context Compaction is triggered, THE Convex Backend SHALL generate a structured summary of the 20 messages via OpenRouter, capturing the key events, emotional arc, ideological positions stated, and any concessions made by that Persona.
4. WHEN the summary is generated, THE Convex Backend SHALL replace the 20 raw messages in the Persona Agent's context window with the single summary, reducing the context size while preserving narrative continuity.
5. THE summary SHALL be prepended with a marker indicating it is a compacted history segment, so the language model understands it is reading a summary rather than raw dialogue.
6. THE Convex Backend SHALL persist each compaction summary in the Persona Agent's record in Convex so that it is available when restoring a Session.
7. IF Context Compaction fails, THEN THE Convex Backend SHALL retain the raw messages and retry compaction on the next turn, logging the failure.

---

### Requirement 24: Audio Streaming

**User Story:** As a user, I want audio to begin playing immediately as it is synthesised, so that there is no waiting period between turns and the conversation feels live.

#### Acceptance Criteria

1. THE Voice Engine SHALL deliver synthesised audio to the frontend via ElevenLabs TTS WebSocket streaming, so that audio chunks are played as they are generated rather than waiting for full synthesis to complete.
2. WHEN a Persona Agent's Dialogue turn text is ready, THE Convex Backend SHALL open a TTS WebSocket stream to ElevenLabs and begin sending text chunks immediately.
3. THE Platform SHALL begin audio playback of the first received audio chunk within 2 seconds of the TTS stream opening.
4. WHEN the TTS stream closes (isFinal event received), THE Platform SHALL transition to the next Persona's turn within 1 second.
5. IF the TTS WebSocket stream is interrupted mid-turn, THEN THE Platform SHALL display the text transcript of the remaining turn content and attempt to resume streaming from the interruption point; IF resumption fails, THEN THE Platform SHALL fall back to displaying the full text transcript for that turn.
6. THE Voice Engine SHALL use the eleven_flash_v2_5 model for all TTS streaming to minimise latency.

---

### Requirement 25: Content Moderation

**User Story:** As a platform operator, I want user interruption inputs to be moderated, so that harmful or inappropriate content does not enter the conversation or influence persona responses.

#### Acceptance Criteria

1. WHEN a user submits an interruption (text or voice-transcribed), THE Convex Backend SHALL pass the input through a content moderation check before incorporating it into the Dialogue context.
2. IF the moderation check flags the input as harmful, hateful, or explicitly inappropriate, THEN THE Convex Backend SHALL reject the interruption, SHALL NOT incorporate it into the Dialogue context, and SHALL display a clear message to the user explaining that the input was not accepted.
3. THE moderation check SHALL complete within 2 seconds so that it does not perceptibly delay the interruption flow.
4. THE Convex Backend SHALL log all rejected interruptions with the Session ID, timestamp, and rejection reason for operator review, without storing the full content of the rejected input.
5. THE Platform SHALL allow the user to rephrase and resubmit a rejected interruption without restarting the interruption flow.
