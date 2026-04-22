// Test OpenRouter image generation with Flux model
// Run with: npx ts-node scripts/test-openrouter-image.ts

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testImageGeneration() {
  const startTime = Date.now();

  const prompt = "A modern podcast logo for 'POV Podcast' - featuring multiple overlapping speech bubbles in different colors representing different perspectives and viewpoints, minimalist design, gradient purple and blue colors, clean vector style, white background";

  console.log("Starting image generation...");
  console.log("Model: black-forest-labs/flux.2-pro");
  console.log("Prompt:", prompt);
  console.log("");

  // OpenRouter uses chat completions endpoint for all models including image gen
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pov-podcast.app",
      "X-Title": "POV Podcast"
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux.2-pro",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const endTime = Date.now();
  const timeTaken = (endTime - startTime) / 1000;

  if (!response.ok) {
    const error = await response.text();
    console.error("Error:", response.status, error);
    return;
  }

  const data = await response.json();

  console.log("=== Results ===");
  console.log(`Time taken: ${timeTaken.toFixed(2)} seconds`);
  console.log("");
  console.log("Response data:", JSON.stringify(data, null, 2));

  // Check for usage/cost info in response
  if (data.usage) {
    console.log("");
    console.log("Usage:", data.usage);
  }
}

testImageGeneration().catch(console.error);
