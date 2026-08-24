import { anyApi, cronJobs, type FunctionReference } from "convex/server";

const crons = cronJobs();

const syncEnabledSources = (anyApi as any).scheduledIngestion
  .syncEnabledSources as FunctionReference<"action", "internal", {}, null>;

crons.interval(
  "sync enabled sources",
  { hours: 1 },
  syncEnabledSources,
  {},
);

export default crons;
