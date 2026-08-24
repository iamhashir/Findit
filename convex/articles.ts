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
  score: v.optional(v.number()),
  commentCount: v.optional(v.number()),
});

export const listLatest = query({
  args: {
    limit: v.optional(v.number()),
    topic: v.optional(v.string()),
  },
  returns: v.array(articleValidator),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 30, 1, 100);

    if (args.topic) {
      return await ctx.db
        .query("articles")
        .withIndex("by_topic_and_published_at", (q) => q.eq("topic", args.topic))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("articles")
      .withIndex("by_published_at")
      .order("desc")
      .take(limit);
  },
});

export const listTrending = query({
  args: {
    limit: v.optional(v.number()),
    topic: v.optional(v.string()),
  },
  returns: v.array(articleValidator),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 30, 1, 100);
    const sampleSize = Math.max(limit, Math.min(150, limit * 4));

    const recent = args.topic
      ? await ctx.db
          .query("articles")
          .withIndex("by_topic_and_published_at", (q) => q.eq("topic", args.topic))
          .order("desc")
          .take(sampleSize)
      : await ctx.db
          .query("articles")
          .withIndex("by_published_at")
          .order("desc")
          .take(sampleSize);

    const now = Date.now();
    return recent
      .sort((a, b) => trendScore(b, now) - trendScore(a, now))
      .slice(0, limit);
  },
});

export const search = query({
  args: {
    query: v.string(),
    topic: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(articleValidator),
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim();
    if (searchTerm.length < 2) return [];

    const limit = bounded(args.limit ?? 30, 1, 50);
    if (args.topic) {
      return await ctx.db
        .query("articles")
        .withSearchIndex("search_title", (q) =>
          q.search("title", searchTerm).eq("topic", args.topic),
        )
        .take(limit);
    }

    return await ctx.db
      .query("articles")
      .withSearchIndex("search_title", (q) => q.search("title", searchTerm))
      .take(limit);
  },
});

export const getById = query({
  args: { id: v.id("articles") },
  returns: v.union(articleValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMany = query({
  args: { ids: v.array(v.id("articles")) },
  returns: v.array(articleValidator),
  handler: async (ctx, args) => {
    const ids = args.ids.slice(0, 100);
    const articles = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return articles.filter((article): article is NonNullable<typeof article> => article !== null);
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
    externalId: v.optional(v.string()),
    author: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    content: v.optional(v.string()),
    topic: v.optional(v.string()),
    score: v.optional(v.number()),
    commentCount: v.optional(v.number()),
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
      externalId: args.externalId,
      author: args.author,
      imageUrl: args.imageUrl,
      content: args.content,
      topic: args.topic,
      score: args.score,
      commentCount: args.commentCount,
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

function trendScore(
  article: { publishedAt: number; score?: number; commentCount?: number },
  now: number,
) {
  const ageHours = Math.max(0, (now - article.publishedAt) / 3_600_000);
  const freshness = Math.max(0, 72 - ageHours);
  const points = Math.log2((article.score ?? 0) + 1) * 10;
  const discussion = Math.log2((article.commentCount ?? 0) + 1) * 5;
  return freshness + points + discussion;
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
