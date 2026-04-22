# RunPod Image Generation API

## Endpoint
```
POST https://api.runpod.ai/v2/wan-2-6-t2i/run
```

## Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_API_KEY"
}
```

## Request Body
```json
{
  "input": {
    "prompt": "A modern tea shop interior, warm afternoon light, minimalist wood design, cinematic photography, medium shot, shallow depth of field, 35mm look, clean lines, natural shadows, soft highlights, cozy seating, neatly arranged tea bar, high detail, Negative prompt: blurry, low-res, watermark, text, logo, cluttered background, overexposed, underexposed, distortion, fisheye, noise",
    "size": "1024*1024",
    "seed": -1,
    "enable_safety_checker": true
  }
}
```

## Example Implementation

```typescript
async function generateImage(prompt: string): Promise<{ id: string; status: string }> {
  const url = "https://api.runpod.ai/v2/wan-2-6-t2i/run";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RUNPOD_API_KEY}`
    },
    body: JSON.stringify({
      input: {
        prompt,
        size: "1024*1024",
        seed: -1,
        enable_safety_checker: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

## Status Polling

After submitting a job, poll the status endpoint:
```
GET https://api.runpod.ai/v2/wan-2-6-t2i/status/{jobId}
```

Poll until `status === "COMPLETED"`, then extract the image URL from the response.

## Prompt Format for Persona Avatars

For persona avatars, construct prompts with:
- Physical description (age, gender, appearance)
- Historical era and cultural context
- Personality traits reflected in expression
- Negative prompt to avoid artifacts

Example:
```
Portrait of a 45-year-old male scholar from Victorian England, wise expression, period-appropriate attire, warm studio lighting, oil painting style, high detail. Negative prompt: blurry, low-res, watermark, modern clothing, anachronistic elements
```
