import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { recommendedSources } from "./sourceDefaults";

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

const healthStatusValidator = v.union(
  v.literal("healthy"),
  v.literal("degraded"),
  v.literal("failing"),
  v.literal("unknown"),
  v.literal("disabled"),
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

const healthOverviewValidator = v.object({
  sourceId: v.id("sources"),
  status: healthStatusValidator,
  lastAttemptAt: v.optional(v.number()),
  lastSuccessAt: v.optional(v.number()),
  lastFailureAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  consecutiveFailures: v.number(),
  totalRuns: v.number(),
  successRate: v.number(),
  averageDiscovered: v.number(),
  averageCreated: v.number(),
  updateRate: v.number(),
  lastDiscovered: v.number(),
  lastCreated: v.number(),
  lastUpdated: v.number(),
  lastSkipped: v.number(),
  lastDurationMs: v.number(),
  lastNeedsBrowser: v.boolean(),
  articleSampleSize: v.number(),
  latestArticleAt: v.optional(v.number()),
  missingDescriptionRate: v.number(),
  missingAuthorRate: v.number(),
  missingContentRate: v.number(),
  missingImageRate: v.number(),
});

function sortSources<T extends { name: string; rank?: number }>(sources: T[]) {
  return sources.sort((a, b) => {
    const aRank = a.rank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.rank ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

function sameStringArray(a: string[] | undefined, b: readonly string[]) {
  return a?.length === b.length && a.every((value, index) => value === b[index]);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `source-${Date.now()}`;
}

function ratio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

export const list = query({
  args: {},
  returns: v.array(sourceValidator),
  handler: async (ctx) => {
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .take(100);

    return sortSources(sources);
  },
});

export const listAll = query({
  args: {},
  returns: v.array(sourceValidator),
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").take(100);
    return sortSources(sources);
  },
});

export const healthOverview = query({
  args: {},
  returns: v.array(healthOverviewValidator),
  handler: async (ctx) => {
    const [sources, healthRows] = await Promise.all([
      ctx.db.query("sources").take(100),
      ctx.db.query("sourceHealth").take(100),
    ]);
    const healthBySource = new Map(healthRows.map((row) => [row.sourceId, row]));
    const now = Date.now();
    const staleAttemptMs = 4 * 60 * 60 * 1_000;
    const results = [];

    for (const source of sources) {
      const health = healthBySource.get(source._id);
      const articles = await ctx.db
        .query("articles")
        .withIndex("by_source", (q) => q.eq("sourceId", source._id))
        .order("desc")
        .take(25);
      const sampleSize = articles.length;
      const latestArticleAt = sampleSize
        ? Math.max(...articles.map((article) => article.publishedAt))
        : undefined;
      const missingDescription = articles.filter((article) => !article.description?.trim()).length;
      const missingAuthor = articles.filter((article) => !article.author?.trim()).length;
      const missingContent = articles.filter((article) => !article.content?.trim()).length;
      const missingImage = articles.filter((article) => !article.imageUrl?.trim()).length;

      let status: "healthy" | "degraded" | "failing" | "unknown" | "disabled" = "unknown";
      if (!source.enabled) status = "disabled";
      else if (health) {
        if (health.consecutiveFailures >= 2) status = "failing";
        else if (
          health.consecutiveFailures === 1 ||
          health.lastNeedsBrowser ||
          now - health.lastAttemptAt > staleAttemptMs
        ) {
          status = "degraded";
        } else {
          status = "healthy";
        }
      }

      const completedWrites = health ? health.totalCreated + health.totalUpdated : 0;
      results.push({
        sourceId: source._id,
        status,
        lastAttemptAt: health?.lastAttemptAt,
        lastSuccessAt: health?.lastSuccessAt,
        lastFailureAt: health?.lastFailureAt,
        lastError: health?.lastError,
        consecutiveFailures: health?.consecutiveFailures ?? 0,
        totalRuns: health?.totalRuns ?? 0,
        successRate: health ? ratio(health.successfulRuns, health.totalRuns) : 0,
        averageDiscovered: health ? ratio(health.totalDiscovered, health.totalRuns) : 0,
        averageCreated: health ? ratio(health.totalCreated, health.totalRuns) : 0,
        updateRate: health ? ratio(health.totalUpdated, completedWrites) : 0,
        lastDiscovered: health?.lastDiscovered ?? 0,
        lastCreated: health?.lastCreated ?? 0,
        lastUpdated: health?.lastUpdated ?? 0,
        lastSkipped: health?.lastSkipped ?? 0,
        lastDurationMs: health?.lastDurationMs ?? 0,
        lastNeedsBrowser: health?.lastNeedsBrowser ?? false,
        articleSampleSize: sampleSize,
        latestArticleAt,
        missingDescriptionRate: ratio(missingDescription, sampleSize),
        missingAuthorRate: ratio(missingAuthor, sampleSize),
        missingContentRate: ratio(missingContent, sampleSize),
        missingImageRate: ratio(missingImage, sampleSize),
      });
    }

    return results;
  },
});

export const getById = query({
  args: { id: v.id("sources") },
  returns: v.union(sourceValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("sources") },
  returns: v.union(sourceValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listEnabledInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(sourceValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 25), 50));
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .take(limit);
    return sortSources(sources);
  },
});

export const recordSyncHealth = internalMutation({
  args: {
    sourceId: v.id("sources"),
    attemptedAt: v.number(),
    durationMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    discovered: v.number(),
    created: v.number(),
    updated: v.number(),
    skipped: v.number(),
    needsBrowser: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sourceHealth")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .unique();
    const values = {
      sourceId: args.sourceId,
      lastAttemptAt: args.attemptedAt,
      lastSuccessAt: args.success ? args.attemptedAt : existing?.lastSuccessAt,
      lastFailureAt: args.success ? existing?.lastFailureAt : args.attemptedAt,
      lastError: args.success ? existing?.lastError : args.error?.slice(0, 1_000),
      consecutiveFailures: args.success ? 0 : (existing?.consecutiveFailures ?? 0) + 1,
      totalRuns: (existing?.totalRuns ?? 0) + 1,
      successfulRuns: (existing?.successfulRuns ?? 0) + (args.success ? 1 : 0),
      totalDiscovered: (existing?.totalDiscovered ?? 0) + args.discovered,
      totalCreated: (existing?.totalCreated ?? 0) + args.created,
      totalUpdated: (existing?.totalUpdated ?? 0) + args.updated,
      totalSkipped: (existing?.totalSkipped ?? 0) + args.skipped,
      lastDiscovered: args.discovered,
      lastCreated: args.created,
      lastUpdated: args.updated,
      lastSkipped: args.skipped,
      lastDurationMs: Math.max(0, Math.floor(args.durationMs)),
      lastNeedsBrowser: args.needsBrowser,
    };

    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert("sourceHealth", values);
    return null;
  },
});

export const ensureRecommended = mutation({
  args: {},
  returns: v.object({ added: v.number(), total: v.number() }),
  handler: async (ctx) => {
    let added = 0;
    const now = Date.now();

    for (const source of recommendedSources) {
      const existing = await ctx.db
        .query("sources")
        .withIndex("by_slug", (q) => q.eq("slug", source.slug))
        .unique();

      const curatedFields = {
        name: source.name,
        slug: source.slug,
        siteUrl: source.siteUrl,
        kind: source.kind,
        category: source.category,
        recommended: true,
        rank: source.rank,
        description: source.description,
        tags: [...source.tags],
        quality: source.quality,
        priority: source.priority,
        ...("feedUrl" in source ? { feedUrl: source.feedUrl } : {}),
        ...("apiUrl" in source ? { apiUrl: source.apiUrl } : {}),
      };

      if (existing) {
        const needsUpdate =
          existing.name !== source.name ||
          existing.siteUrl !== source.siteUrl ||
          existing.kind !== source.kind ||
          existing.category !== source.category ||
          existing.recommended !== true ||
          existing.rank !== source.rank ||
          existing.description !== source.description ||
          existing.quality !== source.quality ||
          existing.priority !== source.priority ||
          !sameStringArray(existing.tags, source.tags) ||
          ("feedUrl" in source && existing.feedUrl !== source.feedUrl) ||
          ("apiUrl" in source && existing.apiUrl !== source.apiUrl);

        if (needsUpdate) {
          await ctx.db.patch(existing._id, {
            ...curatedFields,
            updatedAt: now,
          });
        }
        continue;
      }

      await ctx.db.insert("sources", {
        ...curatedFields,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      added += 1;
    }

    return { added, total: recommendedSources.length };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    siteUrl: v.string(),
    feedUrl: v.string(),
    apiUrl: v.string(),
    kind: kindValidator,
    category: v.string(),
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      throw new Error("A source with this name already exists.");
    }

    const now = Date.now();
    return await ctx.db.insert("sources", {
      name: args.name.trim(),
      slug,
      siteUrl: args.siteUrl.trim(),
      feedUrl: args.feedUrl.trim(),
      apiUrl: args.apiUrl.trim(),
      kind: args.kind,
      category: args.category.trim(),
      enabled: true,
      createdAt: now,
      updatedAt: now,
      recommended: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("sources"),
    name: v.string(),
    siteUrl: v.string(),
    feedUrl: v.string(),
    apiUrl: v.string(),
    kind: kindValidator,
    category: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      siteUrl: args.siteUrl.trim(),
      feedUrl: args.feedUrl.trim(),
      apiUrl: args.apiUrl.trim(),
      kind: args.kind,
      category: args.category.trim(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setEnabled = mutation({
  args: {
    id: v.id("sources"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
    return null;
  },
});
