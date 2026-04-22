/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articleMutations from "../articleMutations.js";
import type * as auth from "../auth.js";
import type * as avatarMutations from "../avatarMutations.js";
import type * as bannerMutations from "../bannerMutations.js";
import type * as exportPrompts from "../exportPrompts.js";
import type * as generateAvatars from "../generateAvatars.js";
import type * as generateBanner from "../generateBanner.js";
import type * as generateScenario from "../generateScenario.js";
import type * as http from "../http.js";
import type * as imageGeneration from "../imageGeneration.js";
import type * as lib_modelConfig from "../lib/modelConfig.js";
import type * as scenarioMutations from "../scenarioMutations.js";
import type * as scenarios from "../scenarios.js";
import type * as seed from "../seed.js";
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
  articleMutations: typeof articleMutations;
  auth: typeof auth;
  avatarMutations: typeof avatarMutations;
  bannerMutations: typeof bannerMutations;
  exportPrompts: typeof exportPrompts;
  generateAvatars: typeof generateAvatars;
  generateBanner: typeof generateBanner;
  generateScenario: typeof generateScenario;
  http: typeof http;
  imageGeneration: typeof imageGeneration;
  "lib/modelConfig": typeof lib_modelConfig;
  scenarioMutations: typeof scenarioMutations;
  scenarios: typeof scenarios;
  seed: typeof seed;
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
