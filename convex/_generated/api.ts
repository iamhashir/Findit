/* eslint-disable */
/**
 * Generated API references for this Convex app.
 * Run `npx convex dev` to regenerate.
 */

import { anyApi } from "convex/server";
import type * as seed from "../seed";
import type * as sources from "../sources";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

type FullApi = ApiFromModules<{
  seed: typeof seed;
  sources: typeof sources;
}>;

export const api = anyApi as FilterApi<
  FullApi,
  FunctionReference<any, "public">
>;

export const internal = anyApi as FilterApi<
  FullApi,
  FunctionReference<any, "internal">
>;
