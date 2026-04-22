# Convex Backend Patterns

> Documentation: https://docs.convex.dev

## Core Concepts

### When to Use Each Function Type

| Type | Use For | Can Access DB | Can Call APIs | Real-time |
|------|---------|---------------|---------------|-----------|
| `query` | Read data | ✅ Direct | ❌ | ✅ Auto-subscribes |
| `mutation` | Write data | ✅ Direct | ❌ | ❌ |
| `action` | External APIs | Via runQuery/runMutation | ✅ | ❌ |
| `httpAction` | Webhooks/REST | Via runQuery/runMutation | ✅ | ❌ |

## Patterns for POV Podcast

### 1. Real-time Session State (Task 7.2, 7.5)

Queries auto-subscribe clients to updates:

```typescript
// convex/sessions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSession = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPersonaStates = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personaAgentStates")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getDialogueTurns = query({
  args: { sessionId: v.id("sessions"), branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("asc")
      .collect();
  },
});
```

Client usage:
```typescript
// React component
const session = useQuery(api.sessions.getSession, { id: sessionId });
const turns = useQuery(api.sessions.getDialogueTurns, { sessionId, branchId });
// Auto-updates when data changes!
```

### 2. Auth-Protected Endpoints (Task 2.3, 7.2)

```typescript
// convex/sessions.ts
import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const startSession = mutation({
  args: { scenarioId: v.id("scenarios"), depthLevel: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const sessionId = await ctx.db.insert("sessions", {
      scenarioId: args.scenarioId,
      userId: identity.tokenIdentifier,
      depthLevel: args.depthLevel,
      status: "active",
      createdAt: Date.now(),
    });

    // Initialize persona agent states
    const personas = await ctx.db
      .query("personas")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .collect();

    for (const persona of personas) {
      await ctx.db.insert("personaAgentStates", {
        sessionId,
        personaId: persona._id,
        emotionalState: { mood: "neutral", conviction: 0.5, willingness: 0.5 },
        contextMessages: [],
      });
    }

    // Create root branch
    await ctx.db.insert("branches", {
      sessionId,
      parentBranchId: null,
      forkPointTurnIndex: 0,
      createdAt: Date.now(),
    });

    return sessionId;
  },
});
```

### 3. External API Calls with Actions (Task 5.3, 8.1)

Pattern: Mutation schedules Action, Action calls API, calls internal Mutation to persist.

```typescript
// convex/ai.ts
import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Step 1: Client calls mutation
export const requestDialogueTurn = mutation({
  args: { sessionId: v.id("sessions"), branchId: v.id("branches") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    // Mark session as generating
    await ctx.db.patch(args.sessionId, { status: "generating" });

    // Schedule the action immediately
    await ctx.scheduler.runAfter(0, internal.ai.generatePersonaTurn, {
      sessionId: args.sessionId,
      branchId: args.branchId,
    });
  },
});

// Step 2: Action calls external API
export const generatePersonaTurn = internalAction({
  args: { sessionId: v.id("sessions"), branchId: v.id("branches") },
  handler: async (ctx, args) => {
    // Get context via internal query
    const context = await ctx.runQuery(internal.ai.getGenerationContext, {
      sessionId: args.sessionId,
      branchId: args.branchId,
    });

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL,
        messages: context.messages,
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    // Step 3: Persist via internal mutation
    await ctx.runMutation(internal.ai.persistDialogueTurn, {
      sessionId: args.sessionId,
      branchId: args.branchId,
      personaId: context.nextSpeakerId,
      text,
    });
  },
});

// Internal helpers
export const getGenerationContext = internalQuery({
  args: { sessionId: v.id("sessions"), branchId: v.id("branches") },
  handler: async (ctx, args) => {
    // Build context for generation
    const session = await ctx.db.get(args.sessionId);
    const turns = await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(20);
    
    // ... build system prompt and messages
    return { messages: [...], nextSpeakerId: "..." };
  },
});

export const persistDialogueTurn = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    branchId: v.id("branches"),
    personaId: v.id("personas"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const turnIndex = await ctx.db
      .query("dialogueTurns")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .collect()
      .then(turns => turns.length);

    await ctx.db.insert("dialogueTurns", {
      branchId: args.branchId,
      personaId: args.personaId,
      turnIndex,
      text: args.text,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.sessionId, { status: "ready" });
  },
});
```

### 4. Scheduled Functions for Retry/Cleanup (Task 5.4, 11.3)

```typescript
// convex/avatars.ts
export const generateAvatars = internalAction({
  args: { personaId: v.id("personas"), attempt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
    const maxAttempts = 3;
    const backoffMs = [60000, 300000, 1800000]; // 1min, 5min, 30min

    try {
      // Call RunPod API
      const response = await fetch(process.env.RUNPOD_ENDPOINT_URL + "/run", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RUNPOD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: { prompt: "..." } }),
      });

      const { id } = await response.json();

      // Schedule status polling
      await ctx.scheduler.runAfter(5000, internal.avatars.pollAvatarStatus, {
        personaId: args.personaId,
        jobId: id,
      });

    } catch (error) {
      if (attempt < maxAttempts) {
        await ctx.scheduler.runAfter(backoffMs[attempt - 1], internal.avatars.generateAvatars, {
          personaId: args.personaId,
          attempt: attempt + 1,
        });
      } else {
        await ctx.runMutation(internal.avatars.markFailed, { personaId: args.personaId });
      }
    }
  },
});

// Cron for auto-pruning (convex/crons.ts)
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("prune stale branches", { hours: 1 }, internal.branches.autoPruneBranches);

export default crons;
```

### 5. HTTP Actions for Webhooks (Optional)

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/elevenlabs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    await ctx.runMutation(internal.audio.handleWebhook, {
      payload: body,
    });

    return new Response(null, { status: 200 });
  }),
});

export default http;
```

### 6. Error Handling with ConvexError

```typescript
import { ConvexError, v } from "convex/values";

export const createBranch = mutation({
  args: { sessionId: v.id("sessions"), forkPointTurnIndex: v.number() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }

    const identity = await ctx.auth.getUserIdentity();
    if (session.userId !== identity?.tokenIdentifier) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your session" });
    }

    // Continue with branch creation...
  },
});
```

Client-side handling:
```typescript
import { ConvexError } from "convex/values";

try {
  await createBranch({ sessionId, forkPointTurnIndex });
} catch (error) {
  if (error instanceof ConvexError) {
    const { code, message } = error.data as { code: string; message: string };
    if (code === "NOT_FOUND") {
      // Handle not found
    }
  }
}
```

### 7. Environment Variables

Set via CLI:
```bash
npx convex env set OPENROUTER_API_KEY 'sk-or-...'
npx convex env set RUNPOD_API_KEY '...'
npx convex env set ELEVENLABS_API_KEY 'xi-...'
npx convex env set OPENROUTER_MODEL 'anthropic/claude-sonnet-4'
```

Access in functions:
```typescript
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY not configured");
}
```

## File Structure

```
convex/
├── _generated/          # Auto-generated
├── schema.ts            # Table definitions
├── auth.ts              # Auth config
├── http.ts              # HTTP routes
├── crons.ts             # Scheduled jobs
├── sessions.ts          # Session queries/mutations
├── scenarios.ts         # Scenario CRUD
├── personas.ts          # Persona CRUD
├── ai.ts                # OpenRouter integration
├── audio.ts             # ElevenLabs integration
├── avatars.ts           # RunPod integration
└── branches.ts          # Branching logic
```

## Key Patterns Summary

1. **Mutations for writes** — Use `ctx.scheduler.runAfter(0, ...)` to trigger actions
2. **Actions for APIs** — Use `ctx.runQuery`/`ctx.runMutation` for DB access
3. **Queries for reads** — Clients auto-subscribe with `useQuery`
4. **Internal functions** — Hide implementation, use for scheduled tasks
5. **ConvexError** — Structured errors that clients can handle
6. **Auth check** — Always verify `ctx.auth.getUserIdentity()` first
