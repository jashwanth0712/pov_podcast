/**
 * transcribeSpeechHttp — Convex HTTP action.
 *
 * Proxies audio blobs to the ElevenLabs Scribe STT API, keeping the
 * ELEVENLABS_API_KEY server-side only (never exposed to the browser).
 *
 * Route: POST /api/transcribe-speech
 *
 * Request:  multipart/form-data with an `audio` field (Blob/File)
 * Response: { text: string }  on success
 *           { error: string } on failure
 *
 * Requirements: 6.1, 6.3, 6.4
 */

import { httpAction } from "./_generated/server";

const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const TIMEOUT_MS = 3000;

export const transcribeSpeechHttp = httpAction(async (ctx, request) => {
  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  // Convex HTTP actions automatically read the Authorization: Bearer <token>
  // header and expose the identity via ctx.auth.getUserIdentity().
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 2. Read API key ─────────────────────────────────────────────────────────
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Transcription service is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 3. Parse multipart/form-data ────────────────────────────────────────────
  let audioBlob: Blob | null = null;
  let audioFileName = "audio.webm";

  try {
    const formData = await request.formData();
    const audioField = formData.get("audio");
    if (!audioField) {
      return new Response(
        JSON.stringify({ error: "Missing `audio` field in form data." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (audioField instanceof File) {
      audioBlob = audioField;
      audioFileName = audioField.name || audioFileName;
    } else if (audioField && typeof (audioField as { size?: unknown }).size === "number") {
      // Treat as Blob-like (covers both Blob and File in environments where
      // Blob instanceof check may not be available)
      audioBlob = audioField as unknown as Blob;
    } else {
      return new Response(
        JSON.stringify({ error: "`audio` field must be a file or blob." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Failed to parse request: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 4. Forward to ElevenLabs with 3-second timeout ─────────────────────────
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const outboundForm = new FormData();
    outboundForm.append("file", audioBlob, audioFileName);
    outboundForm.append("model_id", "scribe_v1");

    const elevenLabsResponse = await fetch(ELEVENLABS_STT_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: outboundForm,
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      return new Response(
        JSON.stringify({
          error: `Transcription service error (${elevenLabsResponse.status}): ${errorText}`,
        }),
        {
          status: elevenLabsResponse.status >= 500 ? 502 : elevenLabsResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = (await elevenLabsResponse.json()) as { text?: string };
    const text = data.text ?? "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    clearTimeout(timeoutHandle);

    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = isAbort
      ? "Transcription timed out. Please try again."
      : `Transcription failed: ${err instanceof Error ? err.message : String(err)}`;

    return new Response(JSON.stringify({ error: message }), {
      status: isAbort ? 504 : 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
