import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { transcribeSpeechHttp } from "./transcribeSpeech";
import {
  synthesiseSpeechHttp,
  synthesiseSpeechOptions,
} from "./synthesiseSpeech";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/transcribe-speech",
  method: "POST",
  handler: transcribeSpeechHttp,
});

http.route({
  path: "/api/synthesise-speech",
  method: "POST",
  handler: synthesiseSpeechHttp,
});

http.route({
  path: "/api/synthesise-speech",
  method: "OPTIONS",
  handler: synthesiseSpeechOptions,
});

export default http;
