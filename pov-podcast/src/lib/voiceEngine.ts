/**
 * voiceEngine.ts — client-side voice utilities.
 *
 * - `transcribeSpeech` — uploads an audio blob to the Convex HTTP STT proxy.
 * - `mapEmotionalStateToVoiceParams` — maps emotional state → ElevenLabs params.
 * - `VoiceEngine` — fetches MP3 streams from the Convex HTTP TTS proxy and
 *   plays them via the Web Audio API.
 *
 * The ELEVENLABS_API_KEY stays on the server. The browser only talks to the
 * Convex HTTP endpoints with a Bearer auth token.
 */

// ─── Endpoints ────────────────────────────────────────────────────────────────

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";
const TRANSCRIBE_ENDPOINT = `${CONVEX_SITE_URL}/api/transcribe-speech`;
const SYNTHESISE_ENDPOINT = `${CONVEX_SITE_URL}/api/synthesise-speech`;

const STT_TIMEOUT_MS = 8000;
const TTS_TIMEOUT_MS = 15000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Mood = "calm" | "frustrated" | "passionate" | "defensive" | "resigned";

export interface EmotionalState {
  mood: Mood;
  convictionLevel: number;
  willingnessToConcede: number;
}

/**
 * ElevenLabs model id used for TTS.
 *
 * `eleven_v3` supports inline audio tags (see ELEVENLABS_AUDIO_TAGS below).
 * Older models (`eleven_flash_v2_5`, `eleven_turbo_v2_5`,
 * `eleven_multilingual_v2`) do NOT support audio tags — tags will be
 * ignored or read aloud literally.
 */
export const TTS_MODEL_ID = "eleven_v3" as const;
export type TtsModelId = typeof TTS_MODEL_ID;

export interface VoiceParams {
  stability: number;
  similarity_boost: number;
  style: number;
  model_id: TtsModelId;
}

/**
 * Canonical list of ElevenLabs v3 inline audio tags. Feed this list into any
 * prompt that generates spoken-text turns so the LLM can request vocal cues.
 *
 * Rules for use in turn text (per ElevenLabs v3 best practices):
 * - Wrap in square brackets, lowercase: `[whispers]`, `[sighs]`.
 * - Place where a real speaker would do that thing — start of a phrase,
 *   between clauses, or before a charged word.
 * - Tags ONLY affect vocal delivery; never describe physical actions.
 *   Use `[sighs]` instead of `*sighs heavily*`.
 * - v3 does NOT support SSML `<break>` tags. Use `[long pause]`,
 *   `[short pause]`, or ellipses (`...`) for pauses.
 * - The chosen voice and its training samples affect tag effectiveness — a
 *   meditative voice will not convincingly `[shout]`.
 *
 * Source: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const ELEVENLABS_AUDIO_TAGS = {
  emotions: [
    "happy",
    "sad",
    "angry",
    "excited",
    "nervous",
    "bored",
    "sarcastic",
    "curious",
    "confused",
    "surprised",
    "disappointed",
    "amused",
    "defeated",
    "hopeful",
    "annoyed",
    "appalled",
    "thoughtful",
    "mischievously",
  ],
  nonVerbal: [
    "laughs",
    "laughs harder",
    "starts laughing",
    "wheezing",
    "giggles",
    "chuckles",
    "stifling laughter",
    "sighs",
    "exhales",
    "exhales sharply",
    "inhales deeply",
    "gasps",
    "crying",
    "sobbing",
    "screams",
    "clears throat",
    "coughs",
    "sniffs",
    "snorts",
    "groans",
    "swallows",
    "gulps",
  ],
  delivery: [
    "whispers",
    "shouts",
    "mumbles",
    "muttering",
    "stutters",
    "sings",
    "singing",
    "softly",
    "quietly",
    "loudly",
    "strongly",
  ],
  pacing: ["short pause", "long pause", "hesitates"],
} as const;

export interface PlayTurnCallbacks {
  onPlaybackStarted?: () => void;
  onPlaybackComplete?: () => void;
  onFallbackToTranscript?: (text: string) => void;
}

// ─── Text sanitiser ───────────────────────────────────────────────────────────

/**
 * Strips `*stage directions*` from a turn's text. Legacy turns and
 * prompt-disobeying LLM output can include body-movement prose wrapped in
 * asterisks (e.g. "*shifts uncomfortably*") — these should never be spoken or
 * shown in the transcript.
 *
 * Preserves `[emotion]` tags in square brackets so ElevenLabs v3 can interpret
 * them as vocal cues.
 */
export function stripStageDirections(text: string): string {
  return text
    .replace(/\*[^*]*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Emotional state → voice parameter mapping ────────────────────────────────

/**
 * Eleven v3 stability presets. The v3 slider is conceptually three positions
 * (the API accepts the underlying float). Per the v3 best-practices guide:
 * - CREATIVE — most expressive, most responsive to audio tags, prone to drift.
 * - NATURAL — balanced default; closest to the reference recording.
 * - ROBUST — highly stable but **less responsive to directional prompts**.
 *
 * For an audio-tag-driven podcast we never want ROBUST (it dampens the very
 * cues the prompt is producing). We map emotional moods onto CREATIVE/NATURAL.
 */
export const V3_STABILITY = {
  creative: 0.0,
  natural: 0.5,
  robust: 1.0,
} as const;

export function mapEmotionalStateToVoiceParams(state: EmotionalState): VoiceParams {
  const moodMap: Record<Mood, Pick<VoiceParams, "stability" | "style">> = {
    calm:       { stability: V3_STABILITY.natural,  style: 0.20 },
    frustrated: { stability: V3_STABILITY.creative, style: 0.80 },
    passionate: { stability: V3_STABILITY.creative, style: 0.65 },
    defensive:  { stability: V3_STABILITY.natural,  style: 0.50 },
    resigned:   { stability: V3_STABILITY.natural,  style: 0.10 },
  };
  const { stability, style } = moodMap[state.mood];
  return {
    stability,
    similarity_boost: 0.75,
    style,
    model_id: TTS_MODEL_ID,
  };
}

// ─── STT: transcribeSpeech ────────────────────────────────────────────────────

export async function transcribeSpeech(
  audioBlob: Blob,
  authToken: string
): Promise<string> {
  if (!CONVEX_SITE_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not configured.");
  }
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const response = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!response.ok) {
      let errorMessage = `Transcription request failed (HTTP ${response.status}).`;
      try {
        const errorBody = (await response.json()) as { error?: string };
        if (errorBody.error) errorMessage = errorBody.error;
      } catch {
        // ignore
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
      throw new Error("Transcription timed out. Please try again or type your message.");
    }
    if (err instanceof Error) throw err;
    throw new Error(`Transcription failed: ${String(err)}`);
  }
}

// ─── TTS: VoiceEngine ─────────────────────────────────────────────────────────

export class VoiceEngine {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserBuffer: Uint8Array<ArrayBuffer> | null = null;

  /** Map of buffer key → pre-fetched MP3 bytes. */
  private synthesisQueue: Map<string, Promise<ArrayBuffer>> = new Map();

  constructor(private readonly getAuthToken: () => Promise<string | null>) {}

  // ── AudioContext lifecycle ─────────────────────────────────────────────────

  /**
   * Returns the shared AudioContext. Exposed so other audio engines
   * (e.g. AmbientEngine) can share the same context rather than creating
   * a second one.
   */
  ensureAudioContext(): AudioContext {
    return this.getAudioContext();
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext();
      this.analyser = null;
      this.analyserBuffer = null;
    }
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  private getAnalyser(): AnalyserNode {
    const ctx = this.getAudioContext();
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.6;
      this.analyserBuffer = new Uint8Array(
        new ArrayBuffer(this.analyser.fftSize)
      );
    }
    return this.analyser;
  }

  /**
   * Instantaneous normalised RMS amplitude in [0, 1] of the currently playing
   * audio. Returns 0 when nothing is playing. Designed to be polled from a
   * requestAnimationFrame loop — cheap, no allocations per call.
   */
  getAmplitude(): number {
    if (!this.currentSource || !this.analyser || !this.analyserBuffer) return 0;
    this.analyser.getByteTimeDomainData(this.analyserBuffer);
    let sumSquares = 0;
    const n = this.analyserBuffer.length;
    for (let i = 0; i < n; i++) {
      // Samples are uint8 centred at 128. Normalise to [-1, 1].
      const v = (this.analyserBuffer[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / n);
    // Typical speech RMS sits around 0.05–0.25. Scale to feel lively.
    return Math.min(1, rms * 3);
  }

  // ── Fetch MP3 from server-side proxy ──────────────────────────────────────

  private async synthesiseTurn(
    voiceId: string,
    voiceParams: VoiceParams,
    text: string
  ): Promise<ArrayBuffer> {
    if (!CONVEX_SITE_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not configured.");
    }
    const token = await this.getAuthToken();
    if (!token) throw new Error("Not authenticated.");

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      const res = await fetch(SYNTHESISE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voiceId, voiceParams, text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `TTS request failed (HTTP ${res.status}).`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      return await res.arrayBuffer();
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  private async playBuffer(
    bytes: ArrayBuffer,
    callbacks: PlayTurnCallbacks
  ): Promise<void> {
    if (bytes.byteLength === 0) return;
    const ctx = this.getAudioContext();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(bytes.slice(0));
    } catch {
      throw new Error("Failed to decode audio data from TTS stream.");
    }

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const analyser = this.getAnalyser();
      // source → analyser → destination. Analyser is a pass-through so audio
      // is unchanged, but we can sample its time-domain data each frame.
      source.connect(analyser);
      analyser.connect(ctx.destination);
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

  // ── Public API ────────────────────────────────────────────────────────────

  async playTurn(
    voiceId: string,
    voiceParams: VoiceParams,
    text: string,
    callbacks: PlayTurnCallbacks = {}
  ): Promise<void> {
    const bufferKey = `${voiceId}:${text}`;
    const buffered = this.synthesisQueue.get(bufferKey);
    if (buffered) this.synthesisQueue.delete(bufferKey);

    let bytes: ArrayBuffer;
    try {
      bytes = buffered
        ? await buffered
        : await this.synthesiseTurn(voiceId, voiceParams, text);
      if (bytes.byteLength === 0) {
        // cached-but-failed pre-fetch; retry once
        bytes = await this.synthesiseTurn(voiceId, voiceParams, text);
      }
    } catch {
      try {
        bytes = await this.synthesiseTurn(voiceId, voiceParams, text);
      } catch {
        callbacks.onFallbackToTranscript?.(text);
        return;
      }
    }

    try {
      await this.playBuffer(bytes, callbacks);
    } catch {
      callbacks.onFallbackToTranscript?.(text);
    }
  }

  bufferNextTurn(voiceId: string, voiceParams: VoiceParams, text: string): void {
    const bufferKey = `${voiceId}:${text}`;
    if (this.synthesisQueue.has(bufferKey)) return;

    const p = this.synthesiseTurn(voiceId, voiceParams, text).catch(
      () => new ArrayBuffer(0)
    );
    this.synthesisQueue.set(bufferKey, p);
  }

  stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
  }

  clearBuffer(): void {
    this.synthesisQueue.clear();
  }

  async dispose(): Promise<void> {
    this.stopPlayback();
    this.clearBuffer();
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}
