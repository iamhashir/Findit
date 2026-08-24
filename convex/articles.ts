import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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
});

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(articleValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 30), 50));
    return await ctx.db
      .query("articles")
      .withIndex("by_published_at")
      .order("desc")
      .take(limit);
  },
});

export const upsertScraped = internalMutation({
  args: {
    sourceId: v.id("sources"),
    sourceName: v.string(),
    title: v.string(),
    url: v.string(),
    canonicalUrl: v.optional(v.string()),
    publishedAt: v.number(),
    description: v.optional(v.string()),
    author: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    content: v.optional(v.string()),
    topic: v.optional(v.string()),
  },
  returns: v.object({
    id: v.id("articles"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("articles")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    const article = {
      sourceId: args.sourceId,
      sourceName: args.sourceName,
      title: args.title,
      url: args.url,
      canonicalUrl: args.canonicalUrl,
      publishedAt: args.publishedAt,
      description: args.description,
      author: args.author,
      imageUrl: args.imageUrl,
      content: args.content,
      topic: args.topic,
      scrapedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, article);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("articles", {
      ...article,
      discoveredAt: now,
    });
    return { id, created: true };
  },
});
