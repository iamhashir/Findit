import { v } from "convex/values";
import { api } from "./_generated/api";
import { internalAction } from "./_generated/server";

const MAX_SOURCES_PER_RUN = 10;
const MAX_ARTICLES_PER_SOURCE = 6;

export const syncEnabledSources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(api.scraper.scrapeAll, {
      maxSources: MAX_SOURCES_PER_RUN,
      maxArticlesPerSource: MAX_ARTICLES_PER_SOURCE,
    });

    return null;
  },
});
