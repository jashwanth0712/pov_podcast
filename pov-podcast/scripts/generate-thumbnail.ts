// Generate 16:9 submission thumbnail variations for POV Podcast.
// Run with: OPENROUTER_API_KEY=... npx tsx scripts/generate-thumbnail.ts

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const envText = readFileSync(".env.local", "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
} catch {}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

const WIDESCREEN = `Ultra-wide cinematic 16:9 widescreen composition, letterbox framing, panoramic aspect ratio 1920x1080, horizontal banner, wide establishing shot, subject centered with large negative space on left and right edges.`;
const NEGATIVE = `Negative prompt: text, letters, words, captions, watermark, logo, UI chrome, modern phones, laptops, cartoon, low-resolution, distorted faces, extra fingers, square crop, portrait orientation.`;

const variations: { name: string; prompt: string }[] = [
  {
    name: "v1-roundtable",
    prompt: `${WIDESCREEN}
A dramatic roundtable scene stretching edge-to-edge across the frame. Iconic silhouettes from different eras of history seated around a long glowing oval podcast table — a WWII-era general in profile on the far left, a 1960s astronaut helmet catching warm light, a Renaissance thinker with a ruff collar, a 20th-century stateswoman, a 19th-century explorer — each lit by the glow of the table.
Above the table floats a translucent holographic microphone haloed by soft blue and amber light, delicate sound waves ripple outward into speech-bubble shapes tinted different colors.
In the center foreground, a single empty chair faces the viewer — the invitation to step in.
Mood: epic painterly cinematic chiaroscuro, volumetric god-rays, subtle film grain, deep navy and warm gold with violet and teal accents. Blade Runner meets Ken Burns. Museum-quality composition, high detail, sharp focus on the microphone and empty chair, soft focus on silhouettes.
${NEGATIVE}`,
  },
  {
    name: "v2-portal",
    prompt: `${WIDESCREEN}
A single modern podcast microphone stands on a wooden desk in the bottom-right third of the frame, warmly lit. Behind it, a massive glowing portal of swirling light opens up across the rest of the widescreen canvas, and through the portal we see layered ghostly tableaus of history overlapping like translucent film frames: a Cuban Missile Crisis war room, Apollo 11 mission control, a Renaissance workshop with Leonardo sketching, Churchill at a WWII map table — all bleeding into each other in warm amber and cold cyan.
Sound waves emanate from the microphone and dissolve into the historical scenes, as if pulling the past through the mic.
Mood: cinematic, mysterious, reverent, painterly, dramatic rim lighting, dust motes in light beams, deep shadows, rich saturated palette of gold, teal, and deep red. Christopher Nolan aesthetic.
${NEGATIVE}`,
  },
  {
    name: "v3-stage",
    prompt: `${WIDESCREEN}
A vast dark theater stage shot in extreme widescreen. Across the stage, a row of historical figures stand in silhouette spotlit by individual warm beams — a 1940s politician, an ancient philosopher in robes, an astronaut, a queen in a crown, a revolutionary general — each in their own column of light, separated by shadows.
At center stage, a single spotlight falls on an empty vintage microphone on a stand, with a glowing red "LIVE ON AIR" halo aura (no text, just the shape of the light ring).
Above the scene, faint colored speech bubble shapes float like drifting lanterns, each a different hue, suggesting clashing perspectives.
Mood: theatrical, operatic, cinematic Roger Deakins lighting, deep black backdrop, volumetric haze, rich painterly texture, dramatic shadows, warm amber spotlights with accents of electric blue and crimson.
${NEGATIVE}`,
  },
];

async function generate(variation: { name: string; prompt: string }) {
  const start = Date.now();
  console.log(`[${variation.name}] generating...`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pov-podcast.app",
      "X-Title": "POV Podcast",
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux.2-pro",
      messages: [{ role: "user", content: variation.prompt }],
    }),
  });

  if (!response.ok) {
    console.error(`[${variation.name}] error:`, response.status, await response.text());
    return;
  }

  const data = await response.json();
  const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    console.error(`[${variation.name}] no image URL`, JSON.stringify(data).slice(0, 300));
    return;
  }

  let buffer: Buffer;
  if (imageUrl.startsWith("data:")) {
    buffer = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
  } else {
    buffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
  }

  const outPath = resolve(`public/submission-thumbnail-${variation.name}.png`);
  writeFileSync(outPath, buffer);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${variation.name}] saved ${outPath} (${elapsed}s, cost $${data.usage?.cost ?? "?"})`);
}

async function main() {
  await Promise.all(variations.map(generate));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
