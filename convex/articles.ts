import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";

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

const storyClusterValidator = v.object({
  primary: articleValidator,
  articles: v.array(articleValidator),
  sourceCount: v.number(),
  latestAt: v.number(),
  isCluster: v.boolean(),
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

export const listClusters = query({
  args: {
    mode: v.union(v.literal("latest"), v.literal("trending")),
    limit: v.optional(v.number()),
    topic: v.optional(v.string()),
  },
  returns: v.object({
    clusters: v.array(storyClusterValidator),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 30, 1, 80);
    const sampleSize = Math.min(240, Math.max(90, limit * 6));

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
    const clusters = clusterArticles(recent);

    clusters.sort((a, b) => {
      if (args.mode === "trending") {
        return clusterTrendScore(b, now) - clusterTrendScore(a, now);
      }
      return b.latestAt - a.latestAt;
    });

    return {
      clusters: clusters.slice(0, limit),
      hasMore: clusters.length > limit || recent.length === sampleSize,
    };
  },
});

export const listBySource = query({
  args: {
    sourceId: v.id("sources"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    articles: v.array(articleValidator),
    articleCount: v.number(),
    countCapped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 40, 1, 100);
    const sample = await ctx.db
      .query("articles")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .order("desc")
      .take(500);

    const sorted = sample.sort((a, b) => b.publishedAt - a.publishedAt);
    return {
      articles: sorted.slice(0, limit),
      articleCount: sample.length,
      countCapped: sample.length === 500,
    };
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
    const [titleMatches, broadMatches] = await Promise.all([
      args.topic
        ? ctx.db
            .query("articles")
            .withSearchIndex("search_title", (q) =>
              q.search("title", searchTerm).eq("topic", args.topic),
            )
            .take(limit)
        : ctx.db
            .query("articles")
            .withSearchIndex("search_title", (q) => q.search("title", searchTerm))
            .take(limit),
      args.topic
        ? ctx.db
            .query("articleSearch")
            .withSearchIndex("search_text", (q) =>
              q.search("searchText", searchTerm).eq("topic", args.topic),
            )
            .take(limit)
        : ctx.db
            .query("articleSearch")
            .withSearchIndex("search_text", (q) => q.search("searchText", searchTerm))
            .take(limit),
    ]);

    const broadArticles = await Promise.all(
      broadMatches.map((match) => ctx.db.get(match.articleId)),
    );
    const byId = new Map<Id<"articles">, Doc<"articles">>();

    for (const article of titleMatches) byId.set(article._id, article);
    for (const article of broadArticles) {
      if (article && !byId.has(article._id)) byId.set(article._id, article);
    }

    return [...byId.values()].slice(0, limit);
  },
});

export const backfillSearch = mutation({
  args: {},
  returns: v.object({
    done: v.boolean(),
    indexed: v.number(),
  }),
  handler: async (ctx) => {
    const state = await ctx.db
      .query("searchBackfill")
      .withIndex("by_key", (q) => q.eq("key", SEARCH_BACKFILL_KEY))
      .unique();

    if (state?.done) return { done: true, indexed: 0 };

    const page = await ctx.db
      .query("articles")
      .withIndex("by_published_at")
      .order("desc")
      .paginate({ cursor: state?.cursor ?? null, numItems: 80 });

    for (const article of page.page) {
      await writeSearchDocument(ctx, article._id, article);
    }

    const now = Date.now();
    if (state) {
      await ctx.db.patch(state._id, {
        cursor: page.continueCursor,
        done: page.isDone,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("searchBackfill", {
        key: SEARCH_BACKFILL_KEY,
        cursor: page.continueCursor,
        done: page.isDone,
        updatedAt: now,
      });
    }

    return { done: page.isDone, indexed: page.page.length };
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
      await writeSearchDocument(ctx, existing._id, article);
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("articles", {
      ...article,
      discoveredAt: now,
    });
    await writeSearchDocument(ctx, id, article);
    return { id, created: true };
  },
});

type StoryCluster = {
  primary: Doc<"articles">;
  articles: Doc<"articles">[];
  sourceCount: number;
  latestAt: number;
  isCluster: boolean;
};

type WorkingCluster = {
  articles: Doc<"articles">[];
  tokenSets: Set<string>[];
  earliestAt: number;
  latestAt: number;
};

type SearchableArticle = Pick<
  Doc<"articles">,
  "title" | "description" | "author" | "sourceName" | "topic"
>;

const SEARCH_BACKFILL_KEY = "article-search-v1";
const CLUSTER_WINDOW_MS = 72 * 60 * 60 * 1_000;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
]);

async function writeSearchDocument(
  ctx: MutationCtx,
  articleId: Id<"articles">,
  article: SearchableArticle,
) {
  const existing = await ctx.db
    .query("articleSearch")
    .withIndex("by_article", (q) => q.eq("articleId", articleId))
    .unique();
  const searchDocument = {
    articleId,
    searchText: buildSearchText(article),
    topic: article.topic,
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, searchDocument);
  } else {
    await ctx.db.insert("articleSearch", searchDocument);
  }
}

function buildSearchText(article: SearchableArticle) {
  return [
    article.title,
    article.description,
    article.author,
    article.sourceName,
    article.topic,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" \n ");
}

function clusterArticles(articles: Doc<"articles">[]): StoryCluster[] {
  const ordered = [...articles].sort((a, b) => b.publishedAt - a.publishedAt);
  const working: WorkingCluster[] = [];

  for (const article of ordered) {
    const tokens = titleTokens(article.title);
    let bestCluster: WorkingCluster | null = null;
    let bestSimilarity = 0;

    for (const candidate of working) {
      if (article.publishedAt < candidate.latestAt - CLUSTER_WINDOW_MS) continue;

      let similarity = 0;
      for (const existingTokens of candidate.tokenSets.slice(0, 5)) {
        similarity = Math.max(similarity, titleSimilarity(tokens, existingTokens));
      }

      if (similarity >= 1 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = candidate;
      }
    }

    if (bestCluster) {
      bestCluster.articles.push(article);
      bestCluster.tokenSets.push(tokens);
      bestCluster.earliestAt = Math.min(bestCluster.earliestAt, article.publishedAt);
      bestCluster.latestAt = Math.max(bestCluster.latestAt, article.publishedAt);
      continue;
    }

    working.push({
      articles: [article],
      tokenSets: [tokens],
      earliestAt: article.publishedAt,
      latestAt: article.publishedAt,
    });
  }

  return working.map((cluster) => finalizeCluster(cluster));
}

function finalizeCluster(cluster: WorkingCluster): StoryCluster {
  const bySource = new Map<string, Doc<"articles">>();
  for (const article of cluster.articles) {
    const key = article.sourceId;
    const existing = bySource.get(key);
    if (!existing || article.publishedAt > existing.publishedAt) {
      bySource.set(key, article);
    }
  }

  const uniqueArticles = [...bySource.values()];
  const primary = choosePrimary(uniqueArticles);
  const remaining = uniqueArticles
    .filter((article) => article._id !== primary._id)
    .sort((a, b) => {
      const aHn = isHackerNews(a) ? 1 : 0;
      const bHn = isHackerNews(b) ? 1 : 0;
      return aHn - bHn || b.publishedAt - a.publishedAt;
    });
  const articles = [primary, ...remaining];

  return {
    primary,
    articles,
    sourceCount: new Set(articles.map((article) => article.sourceId)).size,
    latestAt: Math.max(...articles.map((article) => article.publishedAt)),
    isCluster: articles.length > 1,
  };
}

function choosePrimary(articles: Doc<"articles">[]) {
  return [...articles].sort((a, b) => {
    const qualityDifference = primaryQuality(b) - primaryQuality(a);
    if (qualityDifference !== 0) return qualityDifference;
    return a.publishedAt - b.publishedAt;
  })[0];
}

function primaryQuality(article: Doc<"articles">) {
  let score = isHackerNews(article) ? 0 : 10;
  if (article.content && article.content.length > 400) score += 4;
  if (article.description && article.description.length > 80) score += 2;
  if (article.author) score += 1;
  return score;
}

function isHackerNews(article: Doc<"articles">) {
  return article.sourceName.toLowerCase().includes("hacker news");
}

function titleTokens(title: string) {
  const tokens = title
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  return new Set(tokens);
}

function titleSimilarity(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  let distinctiveShared = 0;
  for (const token of a) {
    if (!b.has(token)) continue;
    intersection += 1;
    if (token.length >= 5 || /\d/.test(token)) distinctiveShared += 1;
  }

  if (intersection < 2) return 0;

  const minSize = Math.min(a.size, b.size);
  const unionSize = a.size + b.size - intersection;
  const overlap = intersection / minSize;
  const jaccard = intersection / unionSize;

  if (intersection >= 3 && overlap >= 0.67 && jaccard >= 0.45) return 1;
  if (
    intersection >= 2 &&
    minSize <= 4 &&
    overlap >= 0.66 &&
    jaccard >= 0.5 &&
    distinctiveShared >= 1
  ) {
    return 1;
  }

  return 0;
}

function clusterTrendScore(cluster: StoryCluster, now: number) {
  const strongestArticle = Math.max(...cluster.articles.map((article) => trendScore(article, now)));
  const coverageBonus = Math.min(24, Math.max(0, cluster.sourceCount - 1) * 8);
  return strongestArticle + coverageBonus;
}

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
