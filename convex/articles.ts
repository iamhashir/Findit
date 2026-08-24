import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  query,
  type MutationCtx,
} from "./_generated/server";

const SUMMARY_LIMIT = 600;
const SEARCH_MIGRATION_KEY = "article-search-v2";
const CLUSTER_WINDOW_MS = 72 * 60 * 60 * 1_000;

const articlePreviewValidator = v.object({
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
  author: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  score: v.optional(v.number()),
  commentCount: v.optional(v.number()),
});

const storyClusterValidator = v.object({
  primary: articlePreviewValidator,
  articles: v.array(articlePreviewValidator),
  sourceCount: v.number(),
  latestAt: v.number(),
  isCluster: v.boolean(),
});

const ingestEntryValidator = v.object({
  title: v.string(),
  url: v.string(),
  canonicalUrl: v.optional(v.string()),
  publishedAt: v.number(),
  description: v.optional(v.string()),
  externalId: v.optional(v.string()),
  author: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  topic: v.optional(v.string()),
  score: v.optional(v.number()),
  commentCount: v.optional(v.number()),
});

const ingestResultValidator = v.object({
  created: v.number(),
  updated: v.number(),
  unchanged: v.number(),
  qualitySampleSize: v.number(),
  latestArticleAt: v.optional(v.number()),
  missingDescriptionRate: v.number(),
  missingAuthorRate: v.number(),
  missingImageRate: v.number(),
});

type ArticlePreview = {
  _id: Id<"articles">;
  _creationTime: number;
  title: string;
  url: string;
  sourceId: Id<"sources">;
  sourceName: string;
  publishedAt: number;
  discoveredAt: number;
  topic?: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  score?: number;
  commentCount?: number;
};

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
  | "_creationTime"
  | "title"
  | "url"
  | "sourceId"
  | "sourceName"
  | "publishedAt"
  | "discoveredAt"
  | "topic"
  | "description"
  | "author"
  | "imageUrl"
  | "score"
  | "commentCount"
>;

export const listLatest = query({
  args: {
    limit: v.optional(v.number()),
    topic: v.optional(v.string()),
  },
  returns: v.array(articlePreviewValidator),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 30, 1, 80);
    const rows = args.topic
      ? await ctx.db
          .query("articles")
          .withIndex("by_topic_and_published_at", (q) => q.eq("topic", args.topic))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("articles")
          .withIndex("by_published_at")
          .order("desc")
          .take(limit);

    return rows.map(toPreview);
  },
});

export const listTrending = query({
  args: {
    limit: v.optional(v.number()),
    topic: v.optional(v.string()),
  },
  returns: v.array(articlePreviewValidator),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 30, 1, 80);
    const sampleSize = Math.max(limit, Math.min(100, limit * 3));
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

    const referenceTime = recent[0]?.publishedAt ?? 0;
    return recent
      .sort((a, b) => trendScore(b, referenceTime) - trendScore(a, referenceTime))
      .slice(0, limit)
      .map(toPreview);
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
    const limit = bounded(args.limit ?? 30, 1, 60);
    const sampleSize = Math.min(120, Math.max(60, limit * 4));
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

    const referenceTime = recent[0]?.publishedAt ?? 0;
    const clusters = clusterArticles(recent);
    clusters.sort((a, b) => {
      if (args.mode === "trending") {
        return clusterTrendScore(b, referenceTime) - clusterTrendScore(a, referenceTime);
      }
      return b.latestAt - a.latestAt;
    });

    return {
      clusters: clusters.slice(0, limit).map((cluster) => ({
        primary: toPreview(cluster.primary),
        articles: cluster.articles.map(toPreview),
        sourceCount: cluster.sourceCount,
        latestAt: cluster.latestAt,
        isCluster: cluster.isCluster,
      })),
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
    articles: v.array(articlePreviewValidator),
    articleCount: v.number(),
    countCapped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = bounded(args.limit ?? 40, 1, 60);
    const [articles, health] = await Promise.all([
      ctx.db
        .query("articles")
        .withIndex("by_source_and_published_at", (q) => q.eq("sourceId", args.sourceId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("sourceHealth")
        .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
        .unique(),
    ]);
    const articleCount = Math.max(articles.length, health?.totalCreated ?? 0);

    return {
      articles: articles.map(toPreview),
      articleCount,
      countCapped: articles.length === limit && articleCount === articles.length,
    };
  },
});

export const search = query({
  args: {
    query: v.string(),
    topic: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(articlePreviewValidator),
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim();
    if (searchTerm.length < 2) return [];

    const limit = bounded(args.limit ?? 24, 1, 40);
    const matches = args.topic
      ? await ctx.db
          .query("articleSearch")
          .withSearchIndex("search_text", (q) =>
            q.search("searchText", searchTerm).eq("topic", args.topic),
          )
          .take(limit)
      : await ctx.db
          .query("articleSearch")
          .withSearchIndex("search_text", (q) => q.search("searchText", searchTerm))
          .take(limit);

    const results: ArticlePreview[] = [];
    const legacyIds: Id<"articles">[] = [];

    for (const match of matches) {
      const preview = previewFromSearchRow(match);
      if (preview) results.push(preview);
      else legacyIds.push(match.articleId);
    }

    if (legacyIds.length > 0) {
      const legacy = await Promise.all(legacyIds.map((id) => ctx.db.get(id)));
      for (const article of legacy) {
        if (article) results.push(toPreview(article));
      }
    }

    return results.slice(0, limit);
  },
});

export const getById = query({
  args: { id: v.id("articles") },
  returns: v.union(articlePreviewValidator, v.null()),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id);
    return article ? toPreview(article) : null;
  },
});

export const getMany = query({
  args: { ids: v.array(v.id("articles")) },
  returns: v.array(articlePreviewValidator),
  handler: async (ctx, args) => {
    const ids = args.ids.slice(0, 60);
    const articles = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return articles
      .filter((article): article is NonNullable<typeof article> => article !== null)
      .map(toPreview);
  },
});

export const ingestBatch = internalMutation({
  args: {
    sourceId: v.id("sources"),
    sourceName: v.string(),
    entries: v.array(ingestEntryValidator),
  },
  returns: ingestResultValidator,
  handler: async (ctx, args) => {
    const entries = args.entries.slice(0, 15).map(normalizeEntry);
    const now = Date.now();
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const entry of entries) {
      const existing = await ctx.db
        .query("articles")
        .withIndex("by_url", (q) => q.eq("url", entry.url))
        .unique();

      if (existing) {
        const next = {
          sourceId: args.sourceId,
          sourceName: args.sourceName,
          title: entry.title,
          url: entry.url,
          canonicalUrl: entry.canonicalUrl,
          publishedAt: entry.publishedAt,
          description: entry.description,
          externalId: entry.externalId,
          author: entry.author,
          imageUrl: entry.imageUrl,
          topic: entry.topic,
          score: entry.score,
          commentCount: entry.commentCount,
        };
        const changed = articleChanged(existing, next) || Boolean(existing.content);

        if (!changed) {
          unchanged += 1;
          continue;
        }

        await ctx.db.patch(existing._id, {
          ...next,
          content: "",
          scrapedAt: now,
        });
        await writeSearchDocument(ctx, existing._id, {
          ...existing,
          ...next,
        });
        updated += 1;
        continue;
      }

      const id = await ctx.db.insert("articles", {
        sourceId: args.sourceId,
        sourceName: args.sourceName,
        title: entry.title,
        url: entry.url,
        canonicalUrl: entry.canonicalUrl,
        publishedAt: entry.publishedAt,
        description: entry.description,
        externalId: entry.externalId,
        author: entry.author,
        imageUrl: entry.imageUrl,
        topic: entry.topic,
        score: entry.score,
        commentCount: entry.commentCount,
        discoveredAt: now,
        scrapedAt: now,
      });
      await writeSearchDocument(ctx, id, {
        _creationTime: now,
        sourceId: args.sourceId,
        sourceName: args.sourceName,
        title: entry.title,
        url: entry.url,
        publishedAt: entry.publishedAt,
        discoveredAt: now,
        topic: entry.topic,
        description: entry.description,
        author: entry.author,
        imageUrl: entry.imageUrl,
        score: entry.score,
        commentCount: entry.commentCount,
      });
      created += 1;
    }

    const sampleSize = entries.length;
    const latestArticleAt = sampleSize
      ? Math.max(...entries.map((entry) => entry.publishedAt))
      : undefined;

    return {
      created,
      updated,
      unchanged,
      qualitySampleSize: sampleSize,
      ...(latestArticleAt ? { latestArticleAt } : {}),
      missingDescriptionRate: ratio(
        entries.filter((entry) => !entry.description).length,
        sampleSize,
      ),
      missingAuthorRate: ratio(entries.filter((entry) => !entry.author).length, sampleSize),
      missingImageRate: ratio(entries.filter((entry) => !entry.imageUrl).length, sampleSize),
    };
  },
});

export const compactLegacyHighlights = internalMutation({
  args: {},
  returns: v.object({
    done: v.boolean(),
    processed: v.number(),
    changed: v.number(),
  }),
  handler: async (ctx) => {
    const state = await ctx.db
      .query("searchBackfill")
      .withIndex("by_key", (q) => q.eq("key", SEARCH_MIGRATION_KEY))
      .unique();
    if (state?.done) return { done: true, processed: 0, changed: 0 };

    const page = await ctx.db
      .query("articles")
      .withIndex("by_published_at")
      .order("desc")
      .paginate({ cursor: state?.cursor ?? null, numItems: 80 });
    let changed = 0;

    for (const article of page.page) {
      const description = trimOptional(article.description, SUMMARY_LIMIT);
      const shouldCompact = Boolean(article.content) || description !== article.description;
      if (shouldCompact) {
        await ctx.db.patch(article._id, {
          content: "",
          description,
        });
        changed += 1;
      }
      await writeSearchDocument(ctx, article._id, {
        ...article,
        description,
      });
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
        key: SEARCH_MIGRATION_KEY,
        cursor: page.continueCursor,
        done: page.isDone,
        updatedAt: now,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(100, internal.articles.compactLegacyHighlights, {});
    }

    return { done: page.isDone, processed: page.page.length, changed };
  },
});

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
    articleCreationTime: article._creationTime,
    title: article.title,
    url: article.url,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    discoveredAt: article.discoveredAt,
    description: article.description,
    author: article.author,
    imageUrl: article.imageUrl,
    score: article.score,
    commentCount: article.commentCount,
  };

  if (existing && searchDocumentChanged(existing, searchDocument)) {
    await ctx.db.patch(existing._id, {
      ...searchDocument,
      updatedAt: Date.now(),
    });
  } else if (!existing) {
    await ctx.db.insert("articleSearch", {
      ...searchDocument,
      updatedAt: Date.now(),
    });
  }
}

function buildSearchText(article: SearchableArticle) {
  return [article.title, article.description, article.author, article.sourceName, article.topic]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" \n ");
}

function toPreview(article: Doc<"articles">): ArticlePreview {
  return {
    _id: article._id,
    _creationTime: article._creationTime,
    title: article.title,
    url: article.url,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    discoveredAt: article.discoveredAt,
    topic: article.topic,
    description: trimOptional(article.description, SUMMARY_LIMIT),
    author: article.author,
    imageUrl: article.imageUrl,
    score: article.score,
    commentCount: article.commentCount,
  };
}

function previewFromSearchRow(row: Doc<"articleSearch">): ArticlePreview | null {
  if (
    row.articleCreationTime === undefined ||
    !row.title ||
    !row.url ||
    !row.sourceId ||
    !row.sourceName ||
    row.publishedAt === undefined ||
    row.discoveredAt === undefined
  ) {
    return null;
  }

  return {
    _id: row.articleId,
    _creationTime: row.articleCreationTime,
    title: row.title,
    url: row.url,
    sourceId: row.sourceId,
    sourceName: row.sourceName,
    publishedAt: row.publishedAt,
    discoveredAt: row.discoveredAt,
    topic: row.topic,
    description: row.description,
    author: row.author,
    imageUrl: row.imageUrl,
    score: row.score,
    commentCount: row.commentCount,
  };
}

function normalizeEntry(entry: {
  title: string;
  url: string;
  canonicalUrl?: string;
  publishedAt: number;
  description?: string;
  externalId?: string;
  author?: string;
  imageUrl?: string;
  topic?: string;
  score?: number;
  commentCount?: number;
}) {
  return {
    ...entry,
    title: entry.title.trim().slice(0, 500),
    url: entry.url.trim(),
    canonicalUrl: trimOptional(entry.canonicalUrl, 1_000),
    description: trimOptional(entry.description, SUMMARY_LIMIT),
    externalId: trimOptional(entry.externalId, 500),
    author: trimOptional(entry.author, 200),
    imageUrl: trimOptional(entry.imageUrl, 1_500),
    topic: trimOptional(entry.topic, 120),
  };
}

function articleChanged(
  existing: Doc<"articles">,
  next: {
    sourceId: Id<"sources">;
    sourceName: string;
    title: string;
    url: string;
    canonicalUrl?: string;
    publishedAt: number;
    description?: string;
    externalId?: string;
    author?: string;
    imageUrl?: string;
    topic?: string;
    score?: number;
    commentCount?: number;
  },
) {
  return (
    existing.sourceId !== next.sourceId ||
    existing.sourceName !== next.sourceName ||
    existing.title !== next.title ||
    existing.url !== next.url ||
    existing.canonicalUrl !== next.canonicalUrl ||
    existing.publishedAt !== next.publishedAt ||
    trimOptional(existing.description, SUMMARY_LIMIT) !== next.description ||
    existing.externalId !== next.externalId ||
    existing.author !== next.author ||
    existing.imageUrl !== next.imageUrl ||
    existing.topic !== next.topic ||
    existing.score !== next.score ||
    existing.commentCount !== next.commentCount
  );
}

function searchDocumentChanged(
  existing: Doc<"articleSearch">,
  next: Omit<Doc<"articleSearch">, "_id" | "_creationTime" | "updatedAt">,
) {
  return (
    existing.searchText !== next.searchText ||
    existing.topic !== next.topic ||
    existing.articleCreationTime !== next.articleCreationTime ||
    existing.title !== next.title ||
    existing.url !== next.url ||
    existing.sourceId !== next.sourceId ||
    existing.sourceName !== next.sourceName ||
    existing.publishedAt !== next.publishedAt ||
    existing.discoveredAt !== next.discoveredAt ||
    existing.description !== next.description ||
    existing.author !== next.author ||
    existing.imageUrl !== next.imageUrl ||
    existing.score !== next.score ||
    existing.commentCount !== next.commentCount
  );
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
    return b.publishedAt - a.publishedAt;
  })[0];
}

function primaryQuality(article: Doc<"articles">) {
  let score = isHackerNews(article) ? 0 : 10;
  if (article.description && article.description.length > 80) score += 3;
  if (article.author) score += 1;
  if (article.imageUrl) score += 1;
  return score;
}

function isHackerNews(article: Doc<"articles">) {
  return article.sourceName.toLowerCase().includes("hacker news");
}

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

function clusterTrendScore(cluster: StoryCluster, referenceTime: number) {
  const strongestArticle = Math.max(
    ...cluster.articles.map((article) => trendScore(article, referenceTime)),
  );
  const coverageBonus = Math.min(24, Math.max(0, cluster.sourceCount - 1) * 8);
  return strongestArticle + coverageBonus;
}

function trendScore(
  article: { publishedAt: number; score?: number; commentCount?: number },
  referenceTime: number,
) {
  const ageHours = Math.max(0, (referenceTime - article.publishedAt) / 3_600_000);
  const freshness = Math.max(0, 72 - ageHours);
  const points = Math.log2((article.score ?? 0) + 1) * 10;
  const discussion = Math.log2((article.commentCount ?? 0) + 1) * 5;
  return freshness + points + discussion;
}

function trimOptional(value: string | undefined, limit: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

function ratio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
