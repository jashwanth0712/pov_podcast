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
import type * as generateAvatars from "../generateAvatars.js";
import type * as generateScenario from "../generateScenario.js";
import type * as http from "../http.js";
import type * as scenarioMutations from "../scenarioMutations.js";
import type * as scenarios from "../scenarios.js";
import type * as seed from "../seed.js";
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
  generateAvatars: typeof generateAvatars;
  generateScenario: typeof generateScenario;
  http: typeof http;
  scenarioMutations: typeof scenarioMutations;
  scenarios: typeof scenarios;
  seed: typeof seed;
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
