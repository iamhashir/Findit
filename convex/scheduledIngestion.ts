import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { internalAction } from "./_generated/server";

const MAX_SOURCES_PER_RUN = 50;
const MAX_ARTICLES_PER_SOURCE = 4;

const syncAll = (anyApi as any).ingestion.syncAll as FunctionReference<
  "action",
  "public",
  { maxSources?: number; maxArticlesPerSource?: number },
  unknown
>;

export const syncEnabledSources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(syncAll, {
      maxSources: MAX_SOURCES_PER_RUN,
      maxArticlesPerSource: MAX_ARTICLES_PER_SOURCE,
    });

    return null;
  },
});
