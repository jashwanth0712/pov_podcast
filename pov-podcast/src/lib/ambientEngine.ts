/**
 * AmbientEngine — client-side Web Audio engine for ambient background music
 * and per-persona character sound effects beneath the primary TTS stream.
 *
 * Design:
 * - Shares the AudioContext owned by VoiceEngine (constructor arg).
 * - Master gain graph:
 *     masterGain (≤0.35 ceiling) → muteGain → destination
 *       ├── musicGain → music source
 *       └── sfxGain[personaId] → sfx source
 * - Muting toggles muteGain without touching stored user-facing volumes.
 *
 * Requirements: 2.4, 2.5, 2.7, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 6.3
 */

// ─── Pure helpers (exported for property tests) ───────────────────────────────

/** Hard ceiling for the combined ambient gain (Req 3.6). */
export const AMBIENT_GAIN_CEILING = 0.35;

/** Returns the ducked music gain (20% of the current user-facing value, Req 3.4). */
export function computeDuckedVolume(currentVolume: number): number {
  return currentVolume * 0.2;
}

/**
 * Returns the combined ambient gain for a given (musicVolume, sfxVolume) pair
 * under the master ceiling. The maximum of the two layers is scaled by the
 * master ceiling so combined output never exceeds AMBIENT_GAIN_CEILING.
 *
 * This matches the Web Audio graph: masterGain caps both legs simultaneously.
 */
export function computeCombinedAmbientGain(
  musicVolume: number,
  sfxVolume: number
): number {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const loudest = Math.max(clamp(musicVolume), clamp(sfxVolume));
  return loudest * AMBIENT_GAIN_CEILING;
}

// ─── AmbientEngine ────────────────────────────────────────────────────────────

const DUCK_RAMP_MS = 300;
const UNDUCK_RAMP_MS = 500;
const VOLUME_RAMP_MS = 200;
const SFX_FADE_MS = 500;
const CROSSFADE_DEFAULT_MS = 4000;

export interface AmbientAudioUrls {
  musicUrl: string | null;
  sfxUrls: Record<string, string | null>;
}

interface SfxNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class AmbientEngine {
  private readonly ctx: AudioContext;

  // Graph
  private readonly masterGain: GainNode;
  private readonly muteGain: GainNode;
  private readonly musicGain: GainNode;

  // Decoded buffers
  private musicBuffer: AudioBuffer | null = null;
  private readonly sfxBuffers: Map<string, AudioBuffer> = new Map();

  // Live nodes
  private musicSource: AudioBufferSourceNode | null = null;
  private readonly activeSfx: Map<string, SfxNode> = new Map();

  // User-facing state
  private musicVolume = 0;
  private sfxVolume = 0;
  private muted = true;
  private ducked = false;

  private disposed = false;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;

    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = AMBIENT_GAIN_CEILING;

    this.muteGain = audioContext.createGain();
    this.muteGain.gain.value = 0; // default muted (Req 5.1)

    this.musicGain = audioContext.createGain();
    this.musicGain.gain.value = 0;

    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.muteGain);
    this.muteGain.connect(audioContext.destination);
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  getMusicVolume(): number {
    return this.musicVolume;
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  isMuted(): boolean {
    return this.muted;
  }

  // ── Asset loading ────────────────────────────────────────────────────────

  /**
   * Load music and SFX audio. Music loads on the main awaited path so the
   * caller can `startMusic()` as soon as the buffer is ready. SFX load in
   * the background so a slow/failed SFX doesn't block playback.
   */
  async loadAudio(urls: AmbientAudioUrls): Promise<void> {
    console.log("[ambient] loadAudio called", {
      hasMusic: !!urls.musicUrl,
      sfxCount: Object.values(urls.sfxUrls).filter(Boolean).length,
    });

    // Kick off SFX fetches without awaiting — they populate sfxBuffers
    // asynchronously. SFX with pending buffers simply don't play until ready.
    for (const [personaId, url] of Object.entries(urls.sfxUrls)) {
      if (!url) continue;
      if (this.sfxBuffers.has(personaId)) continue;
      void this.decodeUrl(url)
        .then((buf) => {
          this.sfxBuffers.set(personaId, buf);
          console.log("[ambient] sfx buffer loaded for", personaId, "duration:", buf.duration.toFixed(2));
        })
        .catch((err) => {
          console.warn("[ambient] sfx fetch failed for", personaId, err);
        });
    }

    // Music is the primary blocker. Await it so callers can startMusic().
    if (urls.musicUrl) {
      const t0 = performance.now();
      try {
        this.musicBuffer = await this.decodeUrl(urls.musicUrl);
        console.log(
          "[ambient] music buffer loaded in",
          (performance.now() - t0).toFixed(0),
          "ms, duration:",
          this.musicBuffer.duration.toFixed(2),
          "s"
        );
      } catch (err) {
        console.warn("[ambient] music fetch/decode failed:", err);
        throw err;
      }
    }
  }

  private async decodeUrl(url: string): Promise<AudioBuffer> {
    const t0 = performance.now();
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ambient audio: HTTP ${res.status}`);
    }
    const bytes = await res.arrayBuffer();
    const tFetch = performance.now() - t0;
    const t1 = performance.now();
    const buf = await this.ctx.decodeAudioData(bytes.slice(0));
    const tDecode = performance.now() - t1;
    console.log(
      "[ambient] fetched",
      (bytes.byteLength / 1024).toFixed(0),
      "KB in",
      tFetch.toFixed(0),
      "ms, decoded in",
      tDecode.toFixed(0),
      "ms"
    );
    return buf;
  }

  // ── Music playback ───────────────────────────────────────────────────────

  private resumeIfSuspended(): void {
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  startMusic(): void {
    if (this.disposed || !this.musicBuffer || this.musicSource) return;
    this.resumeIfSuspended();
    const src = this.ctx.createBufferSource();
    src.buffer = this.musicBuffer;
    src.loop = true;
    src.connect(this.musicGain);
    src.start(0);
    this.musicSource = src;
    this.applyMusicGain();
    console.log("[ambient] startMusic() called — buffer duration:", this.musicBuffer.duration, "s");
  }

  stopMusic(): void {
    if (!this.musicSource) return;
    try {
      this.musicSource.stop();
    } catch {
      // already stopped
    }
    try {
      this.musicSource.disconnect();
    } catch {
      // ignore
    }
    this.musicSource = null;
  }

  // ── SFX playback ─────────────────────────────────────────────────────────

  startSfxForPersona(personaId: string): void {
    if (this.disposed) return;
    const buffer = this.sfxBuffers.get(personaId);
    if (!buffer) return;
    if (this.activeSfx.has(personaId)) return;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gain);
    src.start(0);

    // Fade in to current sfxVolume over 500ms (Req 2.4).
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume, now + SFX_FADE_MS / 1000);

    this.activeSfx.set(personaId, { source: src, gain });
  }

  stopSfxForPersona(personaId: string): void {
    const node = this.activeSfx.get(personaId);
    if (!node) return;
    this.activeSfx.delete(personaId);

    const now = this.ctx.currentTime;
    const fadeEnd = now + SFX_FADE_MS / 1000;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
    node.gain.gain.linearRampToValueAtTime(0, fadeEnd);

    setTimeout(() => {
      try {
        node.source.stop();
      } catch {
        // already stopped
      }
      try {
        node.source.disconnect();
      } catch {
        // ignore
      }
      try {
        node.gain.disconnect();
      } catch {
        // ignore
      }
    }, SFX_FADE_MS + 20);
  }

  // ── Ducking ──────────────────────────────────────────────────────────────

  duckMusic(): void {
    if (this.disposed) return;
    this.ducked = true;
    this.applyMusicGain(DUCK_RAMP_MS);
  }

  unduckMusic(): void {
    if (this.disposed) return;
    this.ducked = false;
    this.applyMusicGain(UNDUCK_RAMP_MS);
  }

  private applyMusicGain(rampMs: number = VOLUME_RAMP_MS): void {
    const target = this.ducked
      ? computeDuckedVolume(this.musicVolume)
      : this.musicVolume;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + rampMs / 1000);
  }

  // ── Volume / mute ────────────────────────────────────────────────────────

  setMusicVolume(volume: number): void {
    this.resumeIfSuspended();
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyMusicGain();
    // Auto-start music when volume goes positive and nothing is playing yet.
    if (this.musicVolume > 0 && this.musicBuffer && !this.musicSource) {
      this.startMusic();
    }
    console.log("[ambient] setMusicVolume", this.musicVolume, "muted:", this.muted);
  }

  setSfxVolume(volume: number): void {
    this.resumeIfSuspended();
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;
    for (const node of this.activeSfx.values()) {
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(node.gain.gain.value, now);
      node.gain.gain.linearRampToValueAtTime(
        this.sfxVolume,
        now + VOLUME_RAMP_MS / 1000
      );
    }
    console.log("[ambient] setSfxVolume", this.sfxVolume);
  }

  setMuted(muted: boolean): void {
    this.resumeIfSuspended();
    // Auto-start music when unmuting if we have a buffer but no live source.
    if (!muted && this.musicBuffer && !this.musicSource) {
      this.startMusic();
    }
    this.muted = muted;
    const now = this.ctx.currentTime;
    const target = muted ? 0 : 1;
    this.muteGain.gain.cancelScheduledValues(now);
    this.muteGain.gain.setValueAtTime(this.muteGain.gain.value, now);
    this.muteGain.gain.linearRampToValueAtTime(
      target,
      now + VOLUME_RAMP_MS / 1000
    );
    console.log(
      "[ambient] setMuted",
      muted,
      "ctx.state:",
      this.ctx.state,
      "musicSource?",
      !!this.musicSource,
      "musicBuffer?",
      !!this.musicBuffer
    );
  }

  // ── Pause / resume ───────────────────────────────────────────────────────

  async pause(): Promise<void> {
    if (this.ctx.state === "running") {
      try {
        await this.ctx.suspend();
      } catch {
        // ignore
      }
    }
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  // ── Crossfade to a new music track (Req 6.3) ─────────────────────────────

  async crossfadeToNewMusic(
    newUrl: string,
    durationMs: number = CROSSFADE_DEFAULT_MS
  ): Promise<void> {
    if (this.disposed) return;
    const newBuffer = await this.decodeUrl(newUrl);

    const oldSource = this.musicSource;
    const oldGain = this.musicGain;

    // Build a parallel gain for the new track; crossfade over durationMs.
    const newGain = this.ctx.createGain();
    newGain.gain.value = 0;
    newGain.connect(this.masterGain);

    const newSource = this.ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;
    newSource.connect(newGain);
    newSource.start(0);

    const now = this.ctx.currentTime;
    const end = now + durationMs / 1000;
    const target = this.ducked
      ? computeDuckedVolume(this.musicVolume)
      : this.musicVolume;

    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, end);

    newGain.gain.setValueAtTime(0, now);
    newGain.gain.linearRampToValueAtTime(target, end);

    // Swap references. The old gain node stays connected (but silenced); we
    // clean it up after the crossfade completes.
    this.musicBuffer = newBuffer;
    this.musicSource = newSource;
    // Reassign musicGain? We cannot reassign the readonly field, but we can
    // redirect future applyMusicGain calls by using the new gain — because
    // the field IS readonly, instead we keep musicGain stable and rewire:
    // disconnect the new gain, connect newSource to musicGain. But a ramp
    // must happen on a single node. Simpler: schedule teardown of the old
    // source, then transplant the new source into the existing musicGain.
    // Because that would require rebuilding the ramp, we keep the parallel
    // new gain for the crossfade and merge after.
    setTimeout(() => {
      if (oldSource) {
        try {
          oldSource.stop();
        } catch {
          /* already stopped */
        }
        try {
          oldSource.disconnect();
        } catch {
          /* ignore */
        }
      }
      // Move the new source onto the primary musicGain so future volume
      // changes apply via applyMusicGain().
      try {
        newSource.disconnect();
      } catch {
        /* ignore */
      }
      newSource.connect(oldGain);
      try {
        newGain.disconnect();
      } catch {
        /* ignore */
      }
      oldGain.gain.cancelScheduledValues(this.ctx.currentTime);
      oldGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }, durationMs + 20);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopMusic();
    for (const personaId of Array.from(this.activeSfx.keys())) {
      this.stopSfxForPersona(personaId);
    }
    try {
      this.musicGain.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.masterGain.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.muteGain.disconnect();
    } catch {
      /* ignore */
    }

    this.musicBuffer = null;
    this.sfxBuffers.clear();
  }
}
