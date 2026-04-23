/**
 * AmbientEngine — client-side engine for ambient background music and
 * per-persona character sound effects.
 *
 * Implementation note: We use HTMLAudioElements (not Web Audio
 * BufferSources) because some browsers/OS combinations silently drop Web
 * Audio output on macOS. HTMLAudioElement playback is robust, and all the
 * features we need (volume, fades, ducking, mute, pause/resume, crossfade)
 * are expressible via `element.volume` and simple requestAnimationFrame
 * ramps.
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

/** Returns the combined ambient gain for (musicVolume, sfxVolume) under ceiling. */
export function computeCombinedAmbientGain(
  musicVolume: number,
  sfxVolume: number
): number {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const loudest = Math.max(clamp(musicVolume), clamp(sfxVolume));
  return loudest * AMBIENT_GAIN_CEILING;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DUCK_RAMP_MS = 300;
const UNDUCK_RAMP_MS = 500;
const VOLUME_RAMP_MS = 200;
const SFX_FADE_MS = 500;
const CROSSFADE_DEFAULT_MS = 4000;

export interface AmbientAudioUrls {
  musicUrl: string | null;
  sfxUrls: Record<string, string | null>;
}

interface SfxTrack {
  el: HTMLAudioElement;
  url: string;
}

// ─── Ramp helper ──────────────────────────────────────────────────────────────

function rampVolume(
  el: HTMLAudioElement,
  target: number,
  durationMs: number,
  onDone?: () => void
): () => void {
  const start = el.volume;
  const t0 = performance.now();
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    const elapsed = performance.now() - t0;
    const t = Math.min(1, elapsed / durationMs);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * t));
    if (t < 1) requestAnimationFrame(tick);
    else onDone?.();
  };
  requestAnimationFrame(tick);
  return () => {
    cancelled = true;
  };
}

// ─── AmbientEngine ────────────────────────────────────────────────────────────

export class AmbientEngine {
  // We still take the AudioContext so VoiceEngine sharing is unchanged, but
  // don't actively route audio through it.
  private readonly ctx: AudioContext | null;

  private musicEl: HTMLAudioElement | null = null;
  private musicUrl: string | null = null;
  private readonly sfxTracks: Map<string, SfxTrack> = new Map();
  private readonly sfxUrls: Map<string, string> = new Map();

  private musicVolume = 0;
  private sfxVolume = 0;
  private muted = true;
  private ducked = false;
  private paused = false;
  private disposed = false;

  private musicRampCancel: (() => void) | null = null;

  constructor(audioContext: AudioContext | null = null) {
    this.ctx = audioContext;
  }

  // ── Getters / diagnostics ────────────────────────────────────────────────

  getMusicVolume(): number {
    return this.musicVolume;
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  isMuted(): boolean {
    return this.muted;
  }

  getGraphState(): {
    ctxState: string;
    ctxTime: number;
    masterGain: number;
    muteGain: number;
    musicGain: number;
    musicSourceActive: boolean;
    ducked: boolean;
  } {
    return {
      ctxState: this.ctx?.state ?? "n/a",
      ctxTime: this.ctx?.currentTime ?? 0,
      masterGain: AMBIENT_GAIN_CEILING,
      muteGain: this.muted ? 0 : 1,
      musicGain: this.musicEl ? this.musicEl.volume : 0,
      musicSourceActive: !!this.musicEl && !this.musicEl.paused,
      ducked: this.ducked,
    };
  }

  playTestTone(): void {
    if (typeof window === "undefined") return;
    const el = new Audio(
      "data:audio/wav;base64,UklGRkoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSYAAAAAAP8APwB/AL8A/wC/AH8APwAAAP8AvwCAAL8A/wC/AH8APwAAAP8AvwCAAL8="
    );
    el.volume = 0.5;
    void el.play().catch((e) => console.warn("[ambient] test tone failed:", e));
    console.log("[ambient] test tone started");
  }

  // ── Asset loading ────────────────────────────────────────────────────────

  /**
   * Prepares the audio elements. Does not block on network — HTMLAudioElement
   * handles buffering and streams playback as bytes arrive.
   */
  async loadAudio(urls: AmbientAudioUrls): Promise<void> {
    console.log("[ambient] loadAudio", {
      hasMusic: !!urls.musicUrl,
      sfxCount: Object.values(urls.sfxUrls).filter(Boolean).length,
    });

    if (urls.musicUrl && urls.musicUrl !== this.musicUrl) {
      if (this.musicEl) {
        this.musicEl.pause();
        this.musicEl.src = "";
      }
      const el = new Audio();
      el.src = urls.musicUrl;
      el.loop = true;
      el.preload = "auto";
      el.volume = this.muted ? 0 : this.effectiveMusicVolume();
      el.crossOrigin = "anonymous";
      this.musicEl = el;
      this.musicUrl = urls.musicUrl;
      console.log("[ambient] music element prepared");
    }

    for (const [personaId, url] of Object.entries(urls.sfxUrls)) {
      if (!url) continue;
      if (this.sfxUrls.get(personaId) === url) continue;
      // Preload the element (but don't play until startSfxForPersona).
      const el = new Audio();
      el.src = url;
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      el.crossOrigin = "anonymous";
      this.sfxUrls.set(personaId, url);
      // Keep the element detached — we'll attach to sfxTracks on play.
      this.sfxTracks.set(personaId, { el, url });
      console.log("[ambient] sfx element prepared for", personaId);
    }
  }

  private effectiveMusicVolume(): number {
    const base = this.ducked
      ? computeDuckedVolume(this.musicVolume)
      : this.musicVolume;
    return base * AMBIENT_GAIN_CEILING;
  }

  private effectiveSfxVolume(): number {
    return this.sfxVolume * AMBIENT_GAIN_CEILING;
  }

  // ── Music playback ───────────────────────────────────────────────────────

  startMusic(): void {
    if (this.disposed || !this.musicEl) return;
    const target = this.muted ? 0 : this.effectiveMusicVolume();
    this.musicEl.volume = target;
    const p = this.musicEl.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => console.warn("[ambient] music play() rejected:", err));
    }
    console.log("[ambient] startMusic()", { volume: target });
  }

  stopMusic(): void {
    if (!this.musicEl) return;
    try {
      this.musicEl.pause();
    } catch {
      /* ignore */
    }
  }

  // ── SFX playback ─────────────────────────────────────────────────────────

  startSfxForPersona(personaId: string): void {
    if (this.disposed) return;
    const track = this.sfxTracks.get(personaId);
    if (!track) return;
    track.el.volume = 0;
    const p = track.el.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => console.warn("[ambient] sfx play() rejected:", err));
    }
    rampVolume(
      track.el,
      this.muted ? 0 : this.effectiveSfxVolume(),
      SFX_FADE_MS
    );
    console.log("[ambient] startSfxForPersona", personaId);
  }

  stopSfxForPersona(personaId: string): void {
    const track = this.sfxTracks.get(personaId);
    if (!track) return;
    rampVolume(track.el, 0, SFX_FADE_MS, () => {
      try {
        track.el.pause();
      } catch {
        /* ignore */
      }
    });
  }

  // ── Ducking ──────────────────────────────────────────────────────────────

  duckMusic(): void {
    if (this.disposed || !this.musicEl) return;
    this.ducked = true;
    this.musicRampCancel?.();
    this.musicRampCancel = rampVolume(
      this.musicEl,
      this.muted ? 0 : this.effectiveMusicVolume(),
      DUCK_RAMP_MS
    );
  }

  unduckMusic(): void {
    if (this.disposed || !this.musicEl) return;
    this.ducked = false;
    this.musicRampCancel?.();
    this.musicRampCancel = rampVolume(
      this.musicEl,
      this.muted ? 0 : this.effectiveMusicVolume(),
      UNDUCK_RAMP_MS
    );
  }

  // ── Volume / mute ────────────────────────────────────────────────────────

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicEl) {
      this.musicRampCancel?.();
      this.musicRampCancel = rampVolume(
        this.musicEl,
        this.muted ? 0 : this.effectiveMusicVolume(),
        VOLUME_RAMP_MS
      );
      // Ensure music is playing if it should be.
      if (this.musicVolume > 0 && !this.muted && this.musicEl.paused) {
        this.startMusic();
      }
    }
    console.log("[ambient] setMusicVolume", this.musicVolume, "muted:", this.muted);
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    const target = this.muted ? 0 : this.effectiveSfxVolume();
    for (const track of this.sfxTracks.values()) {
      if (track.el.paused) continue;
      rampVolume(track.el, target, VOLUME_RAMP_MS);
    }
    console.log("[ambient] setSfxVolume", this.sfxVolume);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicEl) {
      this.musicRampCancel?.();
      this.musicRampCancel = rampVolume(
        this.musicEl,
        muted ? 0 : this.effectiveMusicVolume(),
        VOLUME_RAMP_MS
      );
      if (!muted && this.musicVolume > 0 && this.musicEl.paused) {
        this.startMusic();
      }
    }
    for (const track of this.sfxTracks.values()) {
      if (!track.el.paused) {
        rampVolume(
          track.el,
          muted ? 0 : this.effectiveSfxVolume(),
          VOLUME_RAMP_MS
        );
      }
    }
    console.log("[ambient] setMuted", muted);
  }

  // ── Pause / resume (Req 3.8) ─────────────────────────────────────────────

  async pause(): Promise<void> {
    this.paused = true;
    this.musicEl?.pause();
    for (const track of this.sfxTracks.values()) {
      if (!track.el.paused) track.el.pause();
    }
  }

  async resume(): Promise<void> {
    this.paused = false;
    if (this.musicEl && !this.muted && this.musicVolume > 0) {
      try {
        await this.musicEl.play();
      } catch {
        /* ignore */
      }
    }
  }

  // ── Crossfade (Req 6.3) ──────────────────────────────────────────────────

  async crossfadeToNewMusic(
    newUrl: string,
    durationMs: number = CROSSFADE_DEFAULT_MS
  ): Promise<void> {
    if (this.disposed) return;

    const oldEl = this.musicEl;
    const newEl = new Audio();
    newEl.src = newUrl;
    newEl.loop = true;
    newEl.preload = "auto";
    newEl.volume = 0;
    newEl.crossOrigin = "anonymous";

    this.musicEl = newEl;
    this.musicUrl = newUrl;

    try {
      await newEl.play();
    } catch (err) {
      console.warn("[ambient] crossfade play() rejected:", err);
      return;
    }

    const target = this.muted ? 0 : this.effectiveMusicVolume();
    rampVolume(newEl, target, durationMs);

    if (oldEl) {
      rampVolume(oldEl, 0, durationMs, () => {
        try {
          oldEl.pause();
          oldEl.src = "";
        } catch {
          /* ignore */
        }
      });
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.musicRampCancel?.();
    if (this.musicEl) {
      try {
        this.musicEl.pause();
        this.musicEl.src = "";
      } catch {
        /* ignore */
      }
      this.musicEl = null;
    }
    for (const track of this.sfxTracks.values()) {
      try {
        track.el.pause();
        track.el.src = "";
      } catch {
        /* ignore */
      }
    }
    this.sfxTracks.clear();
    this.sfxUrls.clear();
  }
}
