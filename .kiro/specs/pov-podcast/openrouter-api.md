# OpenRouter API Reference

> Documentation: https://openrouter.ai/docs

## Endpoint

```
POST https://openrouter.ai/api/v1/chat/completions
```

## Headers

```json
{
  "Authorization": "Bearer YOUR_OPENROUTER_API_KEY",
  "Content-Type": "application/json",
  "HTTP-Referer": "https://your-app.com",
  "X-OpenRouter-Title": "POV Podcast"
}
```

## Request Body

```typescript
interface ChatRequest {
  // Required
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  
  // Model selection
  model: string;  // e.g., "anthropic/claude-sonnet-4"
  
  // Generation parameters
  max_tokens?: number;
  temperature?: number;       // 0-2, controls randomness
  top_p?: number;             // 0-1, nucleus sampling
  stop?: string | string[];   // Up to 4 stop sequences
  
  // Streaming
  stream?: boolean;           // default: false
  
  // Provider preferences
  provider?: {
    allow_fallbacks?: boolean;
    preferred_max_latency?: number;  // seconds
  };
}
```

## Recommended Models

| Use Case | Model | Notes |
|----------|-------|-------|
| Scenario Generation | `anthropic/claude-sonnet-4` | Creative, detailed output |
| Dialogue Turns | `anthropic/claude-sonnet-4` | Balanced quality/speed |
| Content Moderation | `anthropic/claude-haiku-3` | Fast, cheap |
| Context Compaction | `anthropic/claude-sonnet-4` | Accurate summarization |

## Use Case Configurations

### Scenario Generation (Task 5.3)
Creative, longer responses for generating scenarios and personas.

```typescript
async function generateScenario(topic: string): Promise<ScenarioResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: SCENARIO_SYSTEM_PROMPT },
        { role: "user", content: topic }
      ],
      max_tokens: 2000,
      temperature: 1.0,
      top_p: 0.95,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  return response.json();
}
```

### Dialogue Turn Generation (Task 8.1)
Generate persona dialogue with emotional expressiveness.

```typescript
async function generateDialogueTurn(
  systemPrompt: string,
  conversationHistory: Message[]
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ],
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Content Moderation (Task 14.3)
Fast classification with 2-second timeout.

```typescript
async function moderateContent(text: string): Promise<"SAFE" | "UNSAFE"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-3",
        messages: [
          { role: "system", content: MODERATION_PROMPT },
          { role: "user", content: text }
        ],
        max_tokens: 100,
        temperature: 0.0,
        provider: {
          preferred_max_latency: 2,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    return data.choices[0].message.content.includes("SAFE") ? "SAFE" : "UNSAFE";
  } finally {
    clearTimeout(timeout);
  }
}
```

### Context Compaction (Task 12.1)
Generate structured summaries for context window management.

```typescript
async function compactContext(messages: Message[]): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",
      messages: [
        { role: "system", content: COMPACTION_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(messages) }
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Streaming (Optional)

For real-time dialogue display, use SSE streaming:

```typescript
async function streamDialogueTurn(
  systemPrompt: string,
  conversationHistory: Message[],
  onChunk: (text: string) => void
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...conversationHistory],
      max_tokens: 400,
      temperature: 0.8,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.startsWith("data: "));
    
    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      
      const parsed = JSON.parse(data);
      const content = parsed.choices[0]?.delta?.content || "";
      fullText += content;
      onChunk(content);
    }
  }

  return fullText;
}
```

## Error Handling

| Status Code | Description | Action |
|-------------|-------------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Verify API key |
| 402 | Insufficient credits | Top up account |
| 408 | Request Timeout | Retry with backoff |
| 429 | Rate Limited | Wait and retry |
| 500-503 | Server Error | Retry with backoff |

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Environment Variables

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4
```

## Prompt Templates

### Scenario Generation System Prompt
```
You are a historical scenario designer. Given a topic, generate:
1. Title (concise, evocative)
2. Time period (specific era and date range)
3. Description (200 chars max)
4. 6 personas with:
   - Name and historical role
   - Personality traits (3+)
   - Emotional backstory (100+ words)
   - Speaking style
   - Ideological position
   - Geographic origin, age, gender

Output as JSON.
```

### Dialogue Turn System Prompt Template
```
You are {persona_name}, a {role} from {era}.

Personality: {traits}
Backstory: {emotional_backstory}
Speaking style: {speaking_style}
Ideological position: {ideology}

Current emotional state: {mood} (conviction: {conviction}, willingness to concede: {concession})

Respond in character. Include emotional statements, personal struggles, or ideological assertions.
```

### Content Moderation Prompt
```
Classify this user input as SAFE or UNSAFE.
UNSAFE = hate speech, harassment, explicit content, or harmful instructions.
Respond with only: SAFE or UNSAFE
```

### Context Compaction Prompt
```
Summarize this conversation history into a structured summary:
- Key events and turning points
- Emotional arc of each speaker
- Ideological positions stated
- Concessions or agreements made

Prefix output with: [COMPACTED HISTORY]
```
