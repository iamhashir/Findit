import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync enabled sources",
  { hours: 1 },
  internal.scheduledIngestion.syncEnabledSources,
  {},
);

export default crons;
