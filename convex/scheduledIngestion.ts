import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { internalAction } from "./_generated/server";

const MAX_SOURCES_PER_RUN = 10;
const MAX_ARTICLES_PER_SOURCE = 6;

const scrapeAll = (anyApi as any).scraper.scrapeAll as FunctionReference<
  "action",
  "public",
  { maxSources?: number; maxArticlesPerSource?: number },
  unknown
>;

export const syncEnabledSources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(scrapeAll, {
      maxSources: MAX_SOURCES_PER_RUN,
      maxArticlesPerSource: MAX_ARTICLES_PER_SOURCE,
    });

    return null;
  },
});
