import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { transcribeSpeechHttp } from "./transcribeSpeech";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/transcribe-speech",
  method: "POST",
  handler: transcribeSpeechHttp,
});

export default http;
