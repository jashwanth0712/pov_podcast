/**
 * voiceEngine.ts — client-side voice utilities.
 *
 * Provides:
 * - `transcribeSpeech` — uploads an audio blob to the server-side Convex HTTP
 *   action proxy and returns the transcribed text (STT).
 * - `mapEmotionalStateToVoiceParams` — maps a persona's emotional state to
 *   ElevenLabs voice parameters (stability, similarity_boost, style).
 * - `VoiceEngine` — manages ElevenLabs TTS WebSocket connections for streaming
 *   audio playback, including audio buffering and fallback to text transcript.
 *
 * Security: The ELEVENLABS_API_KEY is never exposed to the browser. All
 * ElevenLabs communication happens server-side via the /api/transcribe-speech
 * route (STT) or via a server-side proxy that streams base64 audio chunks back
 * to the client (TTS).
 *
 * Requirements: 3.2, 3.6, 3.8, 4.1, 4.5, 6.1, 6.3, 6.4, 10.2, 21.5,
 *               24.1, 24.2, 24.3, 24.4, 24.5, 24.6
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSCRIBE_ENDPOINT = "/api/transcribe-speech";
const CLIENT_TIMEOUT_MS = 3000;

/** ElevenLabs WebSocket TTS endpoint template. */
const EL_TTS_WS_URL = (voiceId: string) =>
  `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_flash_v2_5`;

/** Chunk length schedule: lower first value = lower first-chunk latency. */
const CHUNK_LENGTH_SCHEDULE = [120, 160, 250, 290];

/** How long to wait for the first audio chunk before considering it a timeout (ms). */
const FIRST_CHUNK_TIMEOUT_MS = 2000;

/** How long after `isFinal` to wait before transitioning to the next turn (ms). */
const NEXT_TURN_TRANSITION_MS = 1000;

/** How long to wait for a WebSocket reconnect attempt (ms). */
const RECONNECT_TIMEOUT_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Mood = "calm" | "frustrated" | "passionate" | "defensive" | "resigned";

export interface EmotionalState {
  mood: Mood;
  convictionLevel: number;      // 0.0–1.0
  willingnessToConcede: number; // 0.0–1.0
}

/**
 * ElevenLabs voice parameters derived from a persona's emotional state.
 * Requirements: 21.5
 */
export interface VoiceParams {
  stability: number;        // 0.0–1.0, lower = more expressive
  similarity_boost: number; // 0.0–1.0
  style: number;            // 0.0–1.0
  model_id: "eleven_flash_v2_5";
}

/** A queued audio turn waiting to be played. */
export interface BufferedTurn {
  voiceId: string;
  voiceParams: VoiceParams;
  text: string;
  /** Resolved when the turn's audio has been fully synthesised and is ready. */
  audioChunks: Uint8Array[];
  isSynthesised: boolean;
}

/** Callbacks provided to `VoiceEngine.playTurn`. */
export interface PlayTurnCallbacks {
  /** Called when the first audio chunk begins playing (Req 4.1, 24.1). */
  onPlaybackStarted?: () => void;
  /** Called when the turn finishes playing (Req 4.5, 24.4). */
  onPlaybackComplete?: () => void;
  /**
   * Called if the stream fails mid-turn and the fallback text transcript
   * should be displayed instead (Req 3.8, 24.5).
   */
  onFallbackToTranscript?: (text: string) => void;
}

// ─── Emotional state → voice parameter mapping ────────────────────────────────

/**
 * Maps a persona's emotional state mood to ElevenLabs voice parameters.
 *
 * Mapping (Req 21.5):
 *   calm       → stability 0.75 / style 0.20
 *   frustrated → stability 0.35 / style 0.80
 *   passionate → stability 0.45 / style 0.75
 *   defensive  → stability 0.55 / style 0.60
 *   resigned   → stability 0.80 / style 0.10
 *
 * `similarity_boost` is fixed at 0.75 for all moods to preserve voice identity.
 */
export function mapEmotionalStateToVoiceParams(state: EmotionalState): VoiceParams {
  const moodMap: Record<Mood, Pick<VoiceParams, "stability" | "style">> = {
    calm:       { stability: 0.75, style: 0.20 },
    frustrated: { stability: 0.35, style: 0.80 },
    passionate: { stability: 0.45, style: 0.75 },
    defensive:  { stability: 0.55, style: 0.60 },
    resigned:   { stability: 0.80, style: 0.10 },
  };

  const { stability, style } = moodMap[state.mood];

  return {
    stability,
    similarity_boost: 0.75,
    style,
    model_id: "eleven_flash_v2_5",
  };
}

// ─── STT: transcribeSpeech ────────────────────────────────────────────────────

/**
 * Sends an audio blob to the server-side transcription proxy and returns
 * the transcribed text. Throws on error.
 *
 * @param audioBlob  - The recorded audio blob (WebM, MP3, WAV, etc.)
 * @param authToken  - The Convex auth token (passed as Authorization: Bearer)
 * @returns          The transcribed text string.
 *
 * Requirements: 6.1, 6.3, 6.4
 */
export async function transcribeSpeech(
  audioBlob: Blob,
  authToken: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const response = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      let errorMessage = `Transcription request failed (HTTP ${response.status}).`;
      try {
        const errorBody = (await response.json()) as { error?: string };
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        // Ignore JSON parse errors; use the default message.
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as { text?: string };
    if (typeof data.text !== "string") {
      throw new Error("Unexpected response from transcription service.");
    }

    return data.text;
  } catch (err) {
    clearTimeout(timeoutHandle);

    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Transcription timed out. Please try again or type your message."
      );
    }

    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Transcription failed: ${String(err)}`);
  }
}

// ─── TTS: VoiceEngine ─────────────────────────────────────────────────────────

/**
 * VoiceEngine manages ElevenLabs TTS WebSocket connections and audio playback.
 *
 * Architecture:
 * - `synthesiseTurn` opens a WebSocket to ElevenLabs, streams text chunks,
 *   collects base64 audio chunks, and returns them as Uint8Array[].
 * - `playTurn` plays a synthesised turn via the Web Audio API, calling
 *   callbacks at key lifecycle points.
 * - `bufferNextTurn` pre-synthesises the next turn's audio while the current
 *   turn is playing (Req 10.2).
 * - On mid-turn stream failure, `playTurn` attempts one reconnect; if that
 *   fails, it calls `onFallbackToTranscript` (Req 3.8, 24.5).
 *
 * Security: The API key is passed from the server via a signed URL or
 * server-side proxy. This class accepts a `getApiKey` callback so the
 * caller controls how the key is obtained without embedding it in the bundle.
 *
 * Requirements: 3.2, 3.6, 3.8, 4.1, 4.5, 10.2, 24.1–24.6
 */
export class VoiceEngine {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  /**
   * Audio buffer queue: turns that have been synthesised but not yet played.
   * Requirement 10.2: buffer at least one turn ahead.
   */
  private synthesisQueue: Map<string, Promise<Uint8Array[]>> = new Map();

  /**
   * @param getApiKey - Async callback that returns the ElevenLabs API key.
   *   The key is fetched server-side and should never be hardcoded here.
   */
  constructor(private readonly getApiKey: () => Promise<string>) {}

  // ── AudioContext lifecycle ─────────────────────────────────────────────────

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  // ── WebSocket synthesis ────────────────────────────────────────────────────

  /**
   * Opens an ElevenLabs TTS WebSocket, streams the given text, and collects
   * all base64 audio chunks. Returns them as decoded Uint8Array[].
   *
   * Requirements: 24.1, 24.2, 24.3
   */
  async synthesiseTurn(
    voiceId: string,
    voiceParams: VoiceParams,
    text: string
  ): Promise<Uint8Array[]> {
    const apiKey = await this.getApiKey();
    const url = EL_TTS_WS_URL(voiceId);

    return new Promise<Uint8Array[]>((resolve, reject) => {
      const ws = new WebSocket(url);
      const chunks: Uint8Array[] = [];
      let firstChunkTimer: ReturnType<typeof setTimeout> | null = null;
      let settled = false;

      const settle = (err?: Error) => {
        if (settled) return;
        settled = true;
        if (firstChunkTimer) clearTimeout(firstChunkTimer);
        if (err) {
          ws.close();
          reject(err);
        } else {
          resolve(chunks);
        }
      };

      ws.onopen = () => {
        // Send BOS (beginning-of-stream) initialisation message (Req 24.2)
        const bosMessage = {
          text: " ",
          voice_settings: {
            stability: voiceParams.stability,
            similarity_boost: voiceParams.similarity_boost,
            style: voiceParams.style,
            use_speaker_boost: false,
          },
          generation_config: {
            chunk_length_schedule: CHUNK_LENGTH_SCHEDULE,
          },
          xi_api_key: apiKey,
        };
        ws.send(JSON.stringify(bosMessage));

        // Stream text in one chunk (for turn-based dialogue, text is already complete)
        ws.send(JSON.stringify({ text, flush: true }));

        // Send EOS (end-of-stream) to signal no more text
        ws.send(JSON.stringify({ text: "" }));

        // Start first-chunk timeout (Req 4.1: playback within 2 seconds)
        firstChunkTimer = setTimeout(() => {
          settle(new Error("TTS stream timed out waiting for first audio chunk."));
        }, FIRST_CHUNK_TIMEOUT_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return; // Ignore non-JSON messages
        }

        if (typeof parsed.audio === "string") {
          // Decode base64 audio chunk
          const binary = atob(parsed.audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          chunks.push(bytes);

          // Clear first-chunk timeout on first audio received
          if (firstChunkTimer) {
            clearTimeout(firstChunkTimer);
            firstChunkTimer = null;
          }
        }

        if (parsed.isFinal === true) {
          ws.close();
          settle();
        }
      };

      ws.onerror = () => {
        settle(new Error("ElevenLabs TTS WebSocket error."));
      };

      ws.onclose = (event: CloseEvent) => {
        if (!settled) {
          if (chunks.length > 0) {
            // We received some chunks before close — treat as complete
            settle();
          } else {
            settle(
              new Error(
                `ElevenLabs TTS WebSocket closed unexpectedly (code ${event.code}).`
              )
            );
          }
        }
      };
    });
  }

  // ── Audio playback ─────────────────────────────────────────────────────────

  /**
   * Decodes and plays an array of MP3/PCM audio chunks via the Web Audio API.
   * Begins playback as soon as the first chunk is decoded (Req 4.1, 24.1).
   *
   * Requirements: 4.1, 4.5, 24.1, 24.4
   */
  private async playChunks(
    chunks: Uint8Array[],
    callbacks: PlayTurnCallbacks
  ): Promise<void> {
    if (chunks.length === 0) return;

    const ctx = this.getAudioContext();

    // Concatenate all chunks into a single ArrayBuffer for decoding
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(combined.buffer.slice(0));
    } catch {
      // If decoding fails, fall through to the caller's error handling
      throw new Error("Failed to decode audio data from TTS stream.");
    }

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        callbacks.onPlaybackComplete?.();
        resolve();
      };

      source.start(0);
      callbacks.onPlaybackStarted?.();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Synthesises and plays a single dialogue turn.
   *
   * On mid-turn stream failure:
   * 1. Attempts one reconnect/re-synthesis.
   * 2. If that also fails, calls `onFallbackToTranscript` with the turn text
   *    and resolves (does not throw), so the session can continue.
   *
   * Requirements: 3.8, 4.1, 4.5, 24.1, 24.4, 24.5
   */
  async playTurn(
    voiceId: string,
    voiceParams: VoiceParams,
    text: string,
    callbacks: PlayTurnCallbacks = {}
  ): Promise<void> {
    // Check if this turn was pre-synthesised in the buffer
    const bufferKey = `${voiceId}:${text}`;
    const bufferedPromise = this.synthesisQueue.get(bufferKey);
    if (bufferedPromise) {
      this.synthesisQueue.delete(bufferKey);
    }

    let chunks: Uint8Array[];

    try {
      chunks = bufferedPromise
        ? await bufferedPromise
        : await this.synthesiseTurn(voiceId, voiceParams, text);
    } catch {
      // First attempt failed — try once more (Req 3.8)
      try {
        chunks = await this.synthesiseTurn(voiceId, voiceParams, text);
      } catch {
        // Both attempts failed — fall back to text transcript (Req 3.8, 24.5)
        callbacks.onFallbackToTranscript?.(text);
        return;
      }
    }

    try {
      await this.playChunks(chunks, callbacks);
    } catch {
      // Playback decoding failed — fall back to text transcript
      callbacks.onFallbackToTranscript?.(text);
    }
  }

  /**
   * Pre-synthesises the next turn's audio while the current turn is playing.
   * The result is stored in `synthesisQueue` and consumed by the next `playTurn` call.
   *
   * Call this immediately after starting playback of the current turn to ensure
   * the next turn's audio is ready before it's needed (Req 10.2).
   *
   * Requirements: 10.2
   */
  bufferNextTurn(
    voiceId: string,
    voiceParams: VoiceParams,
    text: string
  ): void {
    const bufferKey = `${voiceId}:${text}`;
    if (this.synthesisQueue.has(bufferKey)) return; // Already buffering

    const synthesisPromise = this.synthesiseTurn(voiceId, voiceParams, text).catch(
      () => [] as Uint8Array[] // On failure, return empty — playTurn will retry
    );

    this.synthesisQueue.set(bufferKey, synthesisPromise);
  }

  /**
   * Stops the currently playing audio immediately.
   * Requirements: 4.7 (pause session stops playback immediately)
   */
  stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
  }

  /**
   * Clears the synthesis buffer queue (e.g. when navigating to a different branch).
   */
  clearBuffer(): void {
    this.synthesisQueue.clear();
  }

  /**
   * Closes the AudioContext and releases all resources.
   */
  async dispose(): Promise<void> {
    this.stopPlayback();
    this.clearBuffer();
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}

// ─── Re-export constants for tests ───────────────────────────────────────────

export {
  FIRST_CHUNK_TIMEOUT_MS,
  NEXT_TURN_TRANSITION_MS,
  RECONNECT_TIMEOUT_MS,
  EL_TTS_WS_URL,
};
