import { v } from "convex/values";
import { query } from "./_generated/server";

const sourceValidator = v.object({
  _id: v.id("sources"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  siteUrl: v.string(),
  feedUrl: v.optional(v.string()),
  apiUrl: v.optional(v.string()),
  kind: v.union(v.literal("rss"), v.literal("api")),
  category: v.string(),
  enabled: v.boolean(),
  createdAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(sourceValidator),
  handler: async (ctx) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .take(100);

    return sources.sort((a, b) => a.name.localeCompare(b.name));
  },
});
