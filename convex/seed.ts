import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { recommendedSources } from "./sourceDefaults";

export const seedSources = internalMutation({
  args: {},
  returns: v.object({
    added: v.number(),
    total: v.number(),
  }),
  handler: async (ctx) => {
    let added = 0;
    const now = Date.now();

    for (const source of recommendedSources) {
      const existing = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          recommended: true,
          rank: source.rank,
          updatedAt: now,
        });
        continue;
      }

      await ctx.db.insert("sources", {
        name: source.name,
        slug: source.slug,
        siteUrl: source.siteUrl,
        ...("feedUrl" in source ? { feedUrl: source.feedUrl } : {}),
        ...("apiUrl" in source ? { apiUrl: source.apiUrl } : {}),
        kind: source.kind,
        category: source.category,
        enabled: true,
        createdAt: now,
        updatedAt: now,
        recommended: true,
        rank: source.rank,
      });
      added += 1;
    }

    return { added, total: recommendedSources.length };
  },
});
