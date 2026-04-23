// Accessibility tests for AmbientAudioControls.
// Validates: Requirements 5.2, 5.3, 5.4

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AmbientAudioControls } from "../AmbientAudioControls";

describe("AmbientAudioControls", () => {
  it("renders ARIA-labelled range inputs that update when volume changes", () => {
    const onMusic = vi.fn();
    const onSfx = vi.fn();
    const onMute = vi.fn();
    const { rerender } = render(
      <AmbientAudioControls
        musicVolume={0.25}
        sfxVolume={0.5}
        isMuted={true}
        onMusicVolumeChange={onMusic}
        onSfxVolumeChange={onSfx}
        onMuteToggle={onMute}
      />
    );

    expect(
      screen.getByLabelText("Background music volume, currently 25%")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Character sounds volume, currently 50%")
    ).toBeInTheDocument();

    rerender(
      <AmbientAudioControls
        musicVolume={0.6}
        sfxVolume={0.5}
        isMuted={true}
        onMusicVolumeChange={onMusic}
        onSfxVolumeChange={onSfx}
        onMuteToggle={onMute}
      />
    );
    expect(
      screen.getByLabelText("Background music volume, currently 60%")
    ).toBeInTheDocument();
  });

  it("mute button exposes correct aria-label and toggles on click", () => {
    const onMute = vi.fn();
    const { rerender } = render(
      <AmbientAudioControls
        musicVolume={0}
        sfxVolume={0}
        isMuted={true}
        onMusicVolumeChange={vi.fn()}
        onSfxVolumeChange={vi.fn()}
        onMuteToggle={onMute}
      />
    );

    const muteBtn = screen.getByRole("button", {
      name: "Unmute ambient audio",
    });
    expect(muteBtn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(muteBtn);
    expect(onMute).toHaveBeenCalledTimes(1);

    rerender(
      <AmbientAudioControls
        musicVolume={0}
        sfxVolume={0}
        isMuted={false}
        onMusicVolumeChange={vi.fn()}
        onSfxVolumeChange={vi.fn()}
        onMuteToggle={onMute}
      />
    );
    expect(
      screen.getByRole("button", { name: "Mute ambient audio" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("range inputs invoke callbacks with normalised 0..1 values", () => {
    const onMusic = vi.fn();
    const onSfx = vi.fn();
    render(
      <AmbientAudioControls
        musicVolume={0}
        sfxVolume={0}
        isMuted={true}
        onMusicVolumeChange={onMusic}
        onSfxVolumeChange={onSfx}
        onMuteToggle={vi.fn()}
      />
    );
    const musicSlider = screen.getByLabelText(
      "Background music volume, currently 0%"
    ) as HTMLInputElement;
    fireEvent.change(musicSlider, { target: { value: "75" } });
    expect(onMusic).toHaveBeenCalledWith(0.75);

    const sfxSlider = screen.getByLabelText(
      "Character sounds volume, currently 0%"
    ) as HTMLInputElement;
    fireEvent.change(sfxSlider, { target: { value: "40" } });
    expect(onSfx).toHaveBeenCalledWith(0.4);
  });

  it("all controls are keyboard-reachable (render to focusable elements)", () => {
    render(
      <AmbientAudioControls
        musicVolume={0}
        sfxVolume={0}
        isMuted={true}
        onMusicVolumeChange={vi.fn()}
        onSfxVolumeChange={vi.fn()}
        onMuteToggle={vi.fn()}
      />
    );
    const musicSlider = screen.getByLabelText(
      "Background music volume, currently 0%"
    );
    const sfxSlider = screen.getByLabelText(
      "Character sounds volume, currently 0%"
    );
    const muteBtn = screen.getByRole("button", {
      name: "Unmute ambient audio",
    });
    // Native <input type=range> and <button> are focusable by default.
    musicSlider.focus();
    expect(document.activeElement).toBe(musicSlider);
    sfxSlider.focus();
    expect(document.activeElement).toBe(sfxSlider);
    muteBtn.focus();
    expect(document.activeElement).toBe(muteBtn);
  });
});
