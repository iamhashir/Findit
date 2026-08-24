import { queryGeneric as query } from "convex/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    return sources.sort((a, b) => a.name.localeCompare(b.name));
  },
});
