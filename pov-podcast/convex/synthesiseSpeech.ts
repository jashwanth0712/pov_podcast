/**
 * synthesiseSpeechHttp — Convex HTTP action.
 *
 * Proxies a text-to-speech request to the ElevenLabs streaming REST endpoint,
 * keeping the ELEVENLABS_API_KEY server-side only. The upstream MP3 body is
 * piped back to the browser, so the client can begin playback before synthesis
 * is complete.
 *
 * Route: POST /api/synthesise-speech
 * Request:  JSON { voiceId, voiceParams: { stability, similarity_boost, style, model_id? }, text }
 * Response: audio/mpeg stream on success, JSON { error } otherwise
 */

import { httpAction } from "./_generated/server";

const ELEVENLABS_TTS_URL = (voiceId: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;

const jsonHeaders = { "Content-Type": "application/json" };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  voiceId: string;
  voiceParams: {
    stability: number;
    similarity_boost: number;
    style: number;
    model_id?: string;
  };
  text: string;
}

export const synthesiseSpeechHttp = httpAction(async (ctx, request) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...jsonHeaders, ...CORS_HEADERS },
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Speech synthesis is not configured." }),
      { status: 503, headers: { ...jsonHeaders, ...CORS_HEADERS } }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...jsonHeaders, ...CORS_HEADERS },
    });
  }

  if (
    typeof body.voiceId !== "string" ||
    !body.voiceId ||
    typeof body.text !== "string" ||
    !body.text ||
    !body.voiceParams
  ) {
    return new Response(
      JSON.stringify({ error: "Missing voiceId, text, or voiceParams." }),
      { status: 400, headers: { ...jsonHeaders, ...CORS_HEADERS } }
    );
  }

  const upstream = await fetch(ELEVENLABS_TTS_URL(body.voiceId), {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: body.text,
      model_id: body.voiceParams.model_id ?? "eleven_flash_v2_5",
      voice_settings: {
        stability: body.voiceParams.stability,
        similarity_boost: body.voiceParams.similarity_boost,
        style: body.voiceParams.style,
        use_speaker_boost: false,
      },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `ElevenLabs TTS error (${upstream.status}): ${errText}`,
      }),
      {
        status: upstream.status >= 500 ? 502 : upstream.status,
        headers: { ...jsonHeaders, ...CORS_HEADERS },
      }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
});

export const synthesiseSpeechOptions = httpAction(async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});
