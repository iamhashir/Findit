import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync due sources",
  { hours: 1 },
  internal.ingestion.syncDueSources,
  {},
);

crons.interval(
  "compact legacy article highlights",
  { hours: 6 },
  internal.articles.compactLegacyHighlights,
  {},
);

export default crons;
