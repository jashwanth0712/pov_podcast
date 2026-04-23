"use client";

import { useCallback } from "react";

export interface AmbientAudioControlsProps {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  isMuted: boolean;
  onMusicVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  /** Diagnostic: current loading/playback state of the ambient engine. */
  status?: {
    musicUrlPresent: boolean;
    sfxCount: number;
    musicBufferLoaded: boolean;
    audioContextState: string;
    graph?: {
      masterGain: number;
      muteGain: number;
      musicGain: number;
      musicSourceActive: boolean;
      ducked: boolean;
    };
  };
  /** Play a test beep directly to the destination (bypasses ambient graph). */
  onTestTone?: () => void;
  /** Raw music URL for HTMLAudioElement fallback playback (bypasses Web Audio). */
  musicUrlForElement?: string | null;
}

/**
 * AmbientAudioControls — settings panel controls for ambient music and
 * character sound effect volumes plus a global mute toggle.
 *
 * Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function AmbientAudioControls({
  musicVolume,
  sfxVolume,
  isMuted,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onMuteToggle,
  status,
  onTestTone,
  musicUrlForElement,
}: AmbientAudioControlsProps) {
  const musicPct = Math.round(musicVolume * 100);
  const sfxPct = Math.round(sfxVolume * 100);

  const handleMusicInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      onMusicVolumeChange(pct / 100);
    },
    [onMusicVolumeChange]
  );

  const handleSfxInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      onSfxVolumeChange(pct / 100);
    },
    [onSfxVolumeChange]
  );

  return (
    <section aria-labelledby="ambient-audio-heading" className="space-y-4">
      <h3
        id="ambient-audio-heading"
        className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40"
      >
        Ambient Audio
      </h3>

      {status && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/60 space-y-0.5 font-mono">
          <div>
            music:{" "}
            {status.musicBufferLoaded
              ? "✓ loaded"
              : status.musicUrlPresent
              ? "fetching…"
              : "no URL"}
          </div>
          <div>sfx clips: {status.sfxCount}</div>
          <div>audio ctx: {status.audioContextState}</div>
          {status.graph && (
            <>
              <div>
                gains → master:{status.graph.masterGain.toFixed(2)} mute:
                {status.graph.muteGain.toFixed(2)} music:
                {status.graph.musicGain.toFixed(2)}
              </div>
              <div>
                music source: {status.graph.musicSourceActive ? "live" : "none"}
                {status.graph.ducked && " · DUCKED"}
              </div>
            </>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {onTestTone && (
              <button
                type="button"
                onClick={onTestTone}
                className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/20"
              >
                Test tone (Web Audio)
              </button>
            )}
            {musicUrlForElement && (
              <audio
                src={musicUrlForElement}
                controls
                loop
                className="mt-1 h-6 w-full"
                aria-label="Raw music playback fallback"
              />
            )}
          </div>
        </div>
      )}

      {/* Music volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ambient-music-volume"
            className="text-sm font-medium text-white/80"
          >
            Background Music
          </label>
          <span className="text-xs text-white/50 tabular-nums">{musicPct}%</span>
        </div>
        <input
          id="ambient-music-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={musicPct}
          onChange={handleMusicInput}
          aria-label={`Background music volume, currently ${musicPct}%`}
          className="
            w-full accent-purple-500
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
            rounded
          "
        />
      </div>

      {/* SFX volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ambient-sfx-volume"
            className="text-sm font-medium text-white/80"
          >
            Character Sounds
          </label>
          <span className="text-xs text-white/50 tabular-nums">{sfxPct}%</span>
        </div>
        <input
          id="ambient-sfx-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={sfxPct}
          onChange={handleSfxInput}
          aria-label={`Character sounds volume, currently ${sfxPct}%`}
          className="
            w-full accent-purple-500
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
            rounded
          "
        />
      </div>

      {/* Mute toggle */}
      <button
        type="button"
        onClick={onMuteToggle}
        aria-pressed={isMuted}
        aria-label={isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
        className={`
          w-full rounded-xl border px-4 py-2.5 text-sm font-medium
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
          ${
            isMuted
              ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              : "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
          }
        `}
      >
        {isMuted ? "Unmute ambient audio" : "Mute ambient audio"}
      </button>
    </section>
  );
}
