import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioCard } from "../ScenarioCard";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock convex/_generated/dataModel — not needed for ScenarioCard unit tests
// since we're passing plain string IDs in tests

const DISCLAIMER =
  "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.";

const baseProps = {
  id: "scenario_abc123" as any,
  title: "World War II",
  timePeriod: "1939–1945",
  era: "Modern" as const,
  description: "A global conflict that reshaped the world.",
  personas: [],
  contentDisclaimer: DISCLAIMER,
};

describe("ScenarioCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders the scenario title", () => {
    render(<ScenarioCard {...baseProps} />);
    expect(screen.getByText("World War II")).toBeInTheDocument();
  });

  it("renders the time period", () => {
    render(<ScenarioCard {...baseProps} />);
    expect(screen.getByText("1939–1945")).toBeInTheDocument();
  });

  it("renders the era badge", () => {
    render(<ScenarioCard {...baseProps} />);
    expect(screen.getByText("Modern")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<ScenarioCard {...baseProps} />);
    expect(
      screen.getByText("A global conflict that reshaped the world.")
    ).toBeInTheDocument();
  });

  it("renders the content disclaimer (Req 8.2)", () => {
    render(<ScenarioCard {...baseProps} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("uses the default disclaimer when none is provided", () => {
    const { id, title, timePeriod, era, description } = baseProps;
    render(<ScenarioCard id={id} title={title} timePeriod={timePeriod} era={era} description={description} />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  // ── Description truncation (Req 1.3) ──────────────────────────────────────

  it("truncates descriptions longer than 200 characters", () => {
    const longDesc = "A".repeat(250);
    render(<ScenarioCard {...baseProps} description={longDesc} />);
    const displayed = screen.getByText(/A+…/);
    expect(displayed.textContent!.length).toBeLessThanOrEqual(201); // 200 chars + ellipsis
  });

  it("does not truncate descriptions of exactly 200 characters", () => {
    const exactDesc = "B".repeat(200);
    render(<ScenarioCard {...baseProps} description={exactDesc} />);
    expect(screen.getByText(exactDesc)).toBeInTheDocument();
  });

  it("does not truncate descriptions shorter than 200 characters", () => {
    const shortDesc = "Short description.";
    render(<ScenarioCard {...baseProps} description={shortDesc} />);
    expect(screen.getByText(shortDesc)).toBeInTheDocument();
  });

  // ── Persona avatars (Req 1.3) ──────────────────────────────────────────────

  it("renders up to 6 persona avatar thumbnails", () => {
    const personas = Array.from({ length: 8 }, (_, i) => ({
      _id: `persona_${i}` as any,
      name: `Persona ${i}`,
      historicalRole: `Role ${i}`,
      profileImageUrl: null,
      avatarGenerationStatus: "pending" as const,
    }));
    render(<ScenarioCard {...baseProps} personas={personas} />);
    // Should show 6 initials avatars (not 8)
    const avatarContainer = screen.getByLabelText(/6 personas/);
    expect(avatarContainer).toBeInTheDocument();
  });

  it("shows initials fallback when avatar is not complete", () => {
    const personas = [
      {
        _id: "persona_1" as any,
        name: "Neil Armstrong",
        historicalRole: "Astronaut",
        profileImageUrl: null,
        avatarGenerationStatus: "pending" as const,
      },
    ];
    render(<ScenarioCard {...baseProps} personas={personas} />);
    // "NA" initials should appear
    expect(screen.getByText("NA")).toBeInTheDocument();
  });

  it("shows overflow count when more than 6 personas", () => {
    const personas = Array.from({ length: 8 }, (_, i) => ({
      _id: `persona_${i}` as any,
      name: `Persona ${i}`,
      historicalRole: `Role ${i}`,
      profileImageUrl: null,
      avatarGenerationStatus: "pending" as const,
    }));
    render(<ScenarioCard {...baseProps} personas={personas} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders no avatar row when personas array is empty", () => {
    render(<ScenarioCard {...baseProps} personas={[]} />);
    // No avatar container should be present
    expect(screen.queryByLabelText(/personas/)).not.toBeInTheDocument();
  });

  // ── Navigation (Req 1.4) ───────────────────────────────────────────────────

  it("navigates to session setup on click", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith("/session/setup/scenario_abc123");
  });

  it("navigates on Enter key press", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/session/setup/scenario_abc123");
  });

  it("navigates on Space key press", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });
    expect(mockPush).toHaveBeenCalledWith("/session/setup/scenario_abc123");
  });

  it("does not navigate on other key presses", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Tab" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it("has a descriptive aria-label", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("aria-label", expect.stringContaining("World War II"));
  });

  it("is keyboard focusable (tabIndex=0)", () => {
    render(<ScenarioCard {...baseProps} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabindex", "0");
  });

  // ── Era badge colours ──────────────────────────────────────────────────────

  it("renders Contemporary era badge", () => {
    render(<ScenarioCard {...baseProps} era="Contemporary" />);
    expect(screen.getByText("Contemporary")).toBeInTheDocument();
  });

  it("renders Ancient era badge", () => {
    render(<ScenarioCard {...baseProps} era="Ancient" />);
    expect(screen.getByText("Ancient")).toBeInTheDocument();
  });
});
