import { anyApi, cronJobs, type FunctionReference } from "convex/server";

const crons = cronJobs();

const syncDueSources = (anyApi as any).ingestion.syncDueSources as FunctionReference<
  "action",
  "internal",
  {},
  null
>;

const compactLegacyHighlights = (anyApi as any).articles.compactLegacyHighlights as FunctionReference<
  "mutation",
  "internal",
  {},
  { done: boolean; processed: number; changed: number }
>;

crons.interval(
  "sync due sources",
  { hours: 1 },
  syncDueSources,
  {},
);

crons.interval(
  "compact legacy article highlights",
  { hours: 6 },
  compactLegacyHighlights,
  {},
);

export default crons;
