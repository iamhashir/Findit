"use node";

import { anyApi, type FunctionReference } from "convex/server";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ensureSupplementalSources = (anyApi as any).supplementalSources.ensure as FunctionReference<
  "mutation",
  "internal",
  {},
  Array<{ sourceId: Id<"sources">; enabled: boolean }>
>;

const syncSource = (anyApi as any).ingestion.syncSource as FunctionReference<
  "action",
  "public",
  { sourceId: Id<"sources">; maxArticles?: number },
  unknown
>;

export const sync = internalAction({
  args: {},
  handler: async (ctx) => {
    const targets = await ctx.runMutation(ensureSupplementalSources, {});

    for (const target of targets) {
      if (!target.enabled) continue;

      try {
        // Supplemental first-party research pages are intentionally read deeper than
        // the default four-item scheduled scrape so older high-value reports are
        // indexed once and remain searchable after they leave the newest-story window.
        await ctx.runAction(syncSource, {
          sourceId: target.sourceId,
          maxArticles: 10,
        });
      } catch {
        // ingestion.syncSource records source-health failures. Keep the maintenance
        // job resilient so one source cannot block the rest of the scheduled catalog.
      }
    }
  },
});
