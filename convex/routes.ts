import { v } from "convex/values";
import { query } from "./_generated/server";

const kindValidator = v.union(
  v.literal("rss"),
  v.literal("api"),
  v.literal("web"),
);

const qualityValidator = v.union(
  v.literal("primary"),
  v.literal("expert"),
  v.literal("publication"),
  v.literal("community"),
);

const sourceValidator = v.object({
  _id: v.id("sources"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  siteUrl: v.string(),
  feedUrl: v.optional(v.string()),
  apiUrl: v.optional(v.string()),
  kind: kindValidator,
  category: v.string(),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  recommended: v.optional(v.boolean()),
  rank: v.optional(v.number()),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  quality: v.optional(qualityValidator),
  priority: v.optional(v.number()),
});

const articleValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  url: v.string(),
  sourceId: v.id("sources"),
  sourceName: v.string(),
  publishedAt: v.number(),
  discoveredAt: v.number(),
  topic: v.optional(v.string()),
  description: v.optional(v.string()),
  externalId: v.optional(v.string()),
  author: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  content: v.optional(v.string()),
  canonicalUrl: v.optional(v.string()),
  scrapedAt: v.optional(v.number()),
  score: v.optional(v.number()),
  commentCount: v.optional(v.number()),
});

export const getArticle = query({
  args: { id: v.string() },
  returns: v.union(
    v.object({
      article: articleValidator,
      sourceSlug: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("articles", args.id);
    if (!id) return null;

    const article = await ctx.db.get(id);
    if (!article) return null;

    const source = await ctx.db.get(article.sourceId);
    return {
      article,
      sourceSlug: source?.slug ?? null,
    };
  },
});

export const getSource = query({
  args: { key: v.string() },
  returns: v.union(sourceValidator, v.null()),
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.key))
      .unique();
    if (bySlug) return bySlug;

    const id = ctx.db.normalizeId("sources", args.key);
    if (!id) return null;
    return await ctx.db.get(id);
  },
});
