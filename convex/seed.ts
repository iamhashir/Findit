import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const initialSources = [
  {
    name: "GitHub Blog",
    slug: "github-blog",
    siteUrl: "https://github.blog/",
    feedUrl: "https://github.blog/feed/",
    kind: "rss" as const,
    category: "Engineering",
  },
  {
    name: "Hacker News",
    slug: "hacker-news",
    siteUrl: "https://news.ycombinator.com/",
    apiUrl: "https://hacker-news.firebaseio.com/v0/",
    kind: "api" as const,
    category: "Community",
  },
  {
    name: "Vercel Blog",
    slug: "vercel-blog",
    siteUrl: "https://vercel.com/blog",
    feedUrl: "https://vercel.com/atom",
    kind: "rss" as const,
    category: "Web",
  },
  {
    name: "Cloudflare Blog",
    slug: "cloudflare-blog",
    siteUrl: "https://blog.cloudflare.com/",
    feedUrl: "https://blog.cloudflare.com/rss/",
    kind: "rss" as const,
    category: "Infrastructure",
  },
];

export const seedSources = internalMutation({
  args: {},
  returns: v.object({
    added: v.number(),
    total: v.number(),
  }),
  handler: async (ctx) => {
    let added = 0;

    for (const source of initialSources) {
      const existing = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert("sources", {
        ...source,
        enabled: true,
        createdAt: Date.now(),
      });
      added += 1;
    }

    return { added, total: initialSources.length };
  },
});
