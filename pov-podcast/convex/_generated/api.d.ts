/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ambientAudioMutations from "../ambientAudioMutations.js";
import type * as ambientAudioQueries from "../ambientAudioQueries.js";
import type * as articleMutations from "../articleMutations.js";
import type * as auth from "../auth.js";
import type * as avatarMutations from "../avatarMutations.js";
import type * as bannerMutations from "../bannerMutations.js";
import type * as branchMutations from "../branchMutations.js";
import type * as compactPersonaContext from "../compactPersonaContext.js";
import type * as compactionMutations from "../compactionMutations.js";
import type * as ensureAmbientAudio from "../ensureAmbientAudio.js";
import type * as exportPrompts from "../exportPrompts.js";
import type * as generateAvatars from "../generateAvatars.js";
import type * as generateBackgroundMusic from "../generateBackgroundMusic.js";
import type * as generateBanner from "../generateBanner.js";
import type * as generateCharacterSoundEffect from "../generateCharacterSoundEffect.js";
import type * as generateCitationExplanation from "../generateCitationExplanation.js";
import type * as generatePersonaTurn from "../generatePersonaTurn.js";
import type * as generatePersonaTurnQueries from "../generatePersonaTurnQueries.js";
import type * as generateScenario from "../generateScenario.js";
import type * as http from "../http.js";
import type * as imageGeneration from "../imageGeneration.js";
import type * as interruptionHelpers from "../interruptionHelpers.js";
import type * as interruptions from "../interruptions.js";
import type * as lib_ambientAudioCache from "../lib/ambientAudioCache.js";
import type * as lib_ambientAudioPrompts from "../lib/ambientAudioPrompts.js";
import type * as lib_branchFork from "../lib/branchFork.js";
import type * as lib_contextCompaction from "../lib/contextCompaction.js";
import type * as lib_dialogueTurnSerialisation from "../lib/dialogueTurnSerialisation.js";
import type * as lib_expressiveness from "../lib/expressiveness.js";
import type * as lib_modelConfig from "../lib/modelConfig.js";
import type * as lib_promptAssembly from "../lib/promptAssembly.js";
import type * as lib_turnTaking from "../lib/turnTaking.js";
import type * as moderateInterruption from "../moderateInterruption.js";
import type * as moderationMutations from "../moderationMutations.js";
import type * as orchestrateMutations from "../orchestrateMutations.js";
import type * as orchestrateQueries from "../orchestrateQueries.js";
import type * as orchestrateTurn from "../orchestrateTurn.js";
import type * as personaRelationships from "../personaRelationships.js";
import type * as scenarioMutations from "../scenarioMutations.js";
import type * as scenarios from "../scenarios.js";
import type * as seed from "../seed.js";
import type * as seedRelationships from "../seedRelationships.js";
import type * as sessionMutations from "../sessionMutations.js";
import type * as sessions from "../sessions.js";
import type * as synthesiseSpeech from "../synthesiseSpeech.js";
import type * as transcribeSpeech from "../transcribeSpeech.js";
import type * as triggerImageGeneration from "../triggerImageGeneration.js";
import type * as users from "../users.js";
import type * as validateArticleUrl from "../validateArticleUrl.js";
import type * as voiceMatching from "../voiceMatching.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ambientAudioMutations: typeof ambientAudioMutations;
  ambientAudioQueries: typeof ambientAudioQueries;
  articleMutations: typeof articleMutations;
  auth: typeof auth;
  avatarMutations: typeof avatarMutations;
  bannerMutations: typeof bannerMutations;
  branchMutations: typeof branchMutations;
  compactPersonaContext: typeof compactPersonaContext;
  compactionMutations: typeof compactionMutations;
  ensureAmbientAudio: typeof ensureAmbientAudio;
  exportPrompts: typeof exportPrompts;
  generateAvatars: typeof generateAvatars;
  generateBackgroundMusic: typeof generateBackgroundMusic;
  generateBanner: typeof generateBanner;
  generateCharacterSoundEffect: typeof generateCharacterSoundEffect;
  generateCitationExplanation: typeof generateCitationExplanation;
  generatePersonaTurn: typeof generatePersonaTurn;
  generatePersonaTurnQueries: typeof generatePersonaTurnQueries;
  generateScenario: typeof generateScenario;
  http: typeof http;
  imageGeneration: typeof imageGeneration;
  interruptionHelpers: typeof interruptionHelpers;
  interruptions: typeof interruptions;
  "lib/ambientAudioCache": typeof lib_ambientAudioCache;
  "lib/ambientAudioPrompts": typeof lib_ambientAudioPrompts;
  "lib/branchFork": typeof lib_branchFork;
  "lib/contextCompaction": typeof lib_contextCompaction;
  "lib/dialogueTurnSerialisation": typeof lib_dialogueTurnSerialisation;
  "lib/expressiveness": typeof lib_expressiveness;
  "lib/modelConfig": typeof lib_modelConfig;
  "lib/promptAssembly": typeof lib_promptAssembly;
  "lib/turnTaking": typeof lib_turnTaking;
  moderateInterruption: typeof moderateInterruption;
  moderationMutations: typeof moderationMutations;
  orchestrateMutations: typeof orchestrateMutations;
  orchestrateQueries: typeof orchestrateQueries;
  orchestrateTurn: typeof orchestrateTurn;
  personaRelationships: typeof personaRelationships;
  scenarioMutations: typeof scenarioMutations;
  scenarios: typeof scenarios;
  seed: typeof seed;
  seedRelationships: typeof seedRelationships;
  sessionMutations: typeof sessionMutations;
  sessions: typeof sessions;
  synthesiseSpeech: typeof synthesiseSpeech;
  transcribeSpeech: typeof transcribeSpeech;
  triggerImageGeneration: typeof triggerImageGeneration;
  users: typeof users;
  validateArticleUrl: typeof validateArticleUrl;
  voiceMatching: typeof voiceMatching;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
