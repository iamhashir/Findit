"use node";

import { anyApi, type FunctionReference } from "convex/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type SupplementalTarget = {
  sourceId: Id<"sources">;
  sourceName: string;
  category: string;
  enabled: boolean;
  crawlUrls: string[];
};

const ensureSupplementalSources = (anyApi as any).supplementalSources.ensure as FunctionReference<
  "mutation",
  "internal",
  {},
  SupplementalTarget[]
>;

const syncSource = (anyApi as any).ingestion.syncSource as FunctionReference<
  "action",
  "public",
  { sourceId: Id<"sources">; maxArticles?: number },
  unknown
>;

const scrapeSource = (anyApi as any).scraper.scrapeSource as FunctionReference<
  "action",
  "internal",
  {
    sourceId: Id<"sources">;
    sourceName: string;
    siteUrl: string;
    category: string;
    maxArticles?: number;
  },
  unknown
>;

export const sync = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const targets = await ctx.runMutation(ensureSupplementalSources, {});

    for (const target of targets) {
      if (!target.enabled) continue;

      try {
        // Read the canonical source deeper than the default four-item scheduled scrape.
        await ctx.runAction(syncSource, {
          sourceId: target.sourceId,
          maxArticles: 10,
        });

        // Some first-party sites split important research into collection/team pages.
        // Crawl those entry points under the same source identity so older high-value
        // reports become searchable without creating duplicate source records.
        for (const siteUrl of target.crawlUrls) {
          await ctx.runAction(scrapeSource, {
            sourceId: target.sourceId,
            sourceName: target.sourceName,
            siteUrl,
            category: target.category,
            maxArticles: 10,
          });
        }
      } catch {
        // The canonical ingestion call records source-health failures. Keep this
        // maintenance job resilient so one supplemental source cannot block others.
      }
    }

    return null;
  },
});
