"use node";

import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const syncResultValidator = v.object({
  sourceId: v.id("sources"),
  sourceName: v.string(),
  discovered: v.number(),
  processed: v.number(),
  created: v.number(),
  updated: v.number(),
  unchanged: v.number(),
  skipped: v.number(),
  needsBrowser: v.boolean(),
  qualitySampleSize: v.number(),
  latestArticleAt: v.optional(v.number()),
  missingDescriptionRate: v.number(),
  missingAuthorRate: v.number(),
  missingImageRate: v.number(),
});

type SyncResult = {
  sourceId: Id<"sources">;
  sourceName: string;
  discovered: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  needsBrowser: boolean;
  qualitySampleSize: number;
  latestArticleAt?: number;
  missingDescriptionRate: number;
  missingAuthorRate: number;
  missingImageRate: number;
};

const rssSyncSource = (anyApi as any).rss.syncSource as FunctionReference<
  "action",
  "internal",
  {
    sourceId: Id<"sources">;
    sourceName: string;
    feedUrl: string;
    category: string;
    maxArticles?: number;
  },
  SyncResult
>;

const hackerNewsSyncSource = (anyApi as any).hackerNews.syncSource as FunctionReference<
  "action",
  "internal",
  {
    sourceId: Id<"sources">;
    sourceName: string;
    apiUrl?: string;
    category: string;
    maxArticles?: number;
  },
  SyncResult
>;

const scrapeSource = (anyApi as any).scraper.scrapeSource as FunctionReference<
  "action",
  "internal",
  {
    sourceId: Id<"sources">;
    sourceName: string;
    siteUrl: string;
    category: string;
    maxArticles?: number;
  },
  SyncResult
>;

export const syncSource = action({
  args: {
    sourceId: v.id("sources"),
    maxArticles: v.optional(v.number()),
  },
  returns: syncResultValidator,
  handler: async (ctx, args) => {
    const source = await ctx.runQuery(internal.sources.getByIdInternal, {
      id: args.sourceId,
    });
    if (!source) throw new Error("Source not found.");
    return await syncOneSourceTracked(ctx, source, bounded(args.maxArticles ?? 6, 1, 10));
  },
});

export const syncAll = action({
  args: {
    maxSources: v.optional(v.number()),
    maxArticlesPerSource: v.optional(v.number()),
    dueOnly: v.optional(v.boolean()),
  },
  returns: v.array(syncResultValidator),
  handler: async (ctx, args) => {
    const maxSources = bounded(args.maxSources ?? 20, 1, 30);
    const maxArticles = bounded(args.maxArticlesPerSource ?? 4, 1, 10);
    const sources = args.dueOnly === false
      ? await ctx.runQuery(internal.sources.listEnabledInternal, { limit: maxSources })
      : await ctx.runQuery(internal.sources.listDueEnabledInternal, {
          limit: maxSources,
          now: Date.now(),
        });
    return await syncSources(ctx, sources, maxArticles);
  },
});

export const syncDueSources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sources = await ctx.runQuery(internal.sources.listDueEnabledInternal, {
      limit: 20,
      now: Date.now(),
    });
    await syncSources(ctx, sources, 4);
    return null;
  },
});

async function syncSources(ctx: ActionCtx, sources: Doc<"sources">[], maxArticles: number) {
  const results: SyncResult[] = [];
  for (let index = 0; index < sources.length; index += 4) {
    const batch = sources.slice(index, index + 4);
    const batchResults = await Promise.all(
      batch.map(async (source) => {
        try {
          return await syncOneSourceTracked(ctx, source, maxArticles);
        } catch {
          return emptyResult(source);
        }
      }),
    );
    results.push(...batchResults);
  }
  return results;
}

async function syncOneSourceTracked(
  ctx: ActionCtx,
  source: Doc<"sources">,
  maxArticles: number,
): Promise<SyncResult> {
  const attemptedAt = Date.now();
  try {
    const result = await syncOneSource(ctx, source, maxArticles);
    await ctx.runMutation(internal.sources.recordSyncHealth, {
      sourceId: source._id,
      attemptedAt,
      durationMs: Date.now() - attemptedAt,
      success: true,
      discovered: result.discovered,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      needsBrowser: result.needsBrowser,
      qualitySampleSize: result.qualitySampleSize,
      latestArticleAt: result.latestArticleAt,
      missingDescriptionRate: result.missingDescriptionRate,
      missingAuthorRate: result.missingAuthorRate,
      missingImageRate: result.missingImageRate,
    });
    return result;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown sync failure";
    await ctx.runMutation(internal.sources.recordSyncHealth, {
      sourceId: source._id,
      attemptedAt,
      durationMs: Date.now() - attemptedAt,
      success: false,
      error: message,
      discovered: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      needsBrowser: source.kind === "web",
    });
    throw cause;
  }
}

async function syncOneSource(
  ctx: ActionCtx,
  source: Doc<"sources">,
  maxArticles: number,
): Promise<SyncResult> {
  if (source.kind === "rss" && source.feedUrl?.trim()) {
    return await ctx.runAction(rssSyncSource, {
      sourceId: source._id,
      sourceName: source.name,
      feedUrl: source.feedUrl,
      category: source.category,
      maxArticles: bounded(maxArticles, 1, 15),
    });
  }

  if (
    source.kind === "api" &&
    (source.slug === "hacker-news" || source.apiUrl?.includes("hacker-news.firebaseio.com"))
  ) {
    return await ctx.runAction(hackerNewsSyncSource, {
      sourceId: source._id,
      sourceName: source.name,
      apiUrl: source.apiUrl,
      category: source.category,
      maxArticles: bounded(maxArticles, 1, 15),
    });
  }

  return await ctx.runAction(scrapeSource, {
    sourceId: source._id,
    sourceName: source.name,
    siteUrl: source.siteUrl,
    category: source.category,
    maxArticles: bounded(maxArticles, 1, 10),
  });
}

function emptyResult(source: Doc<"sources">): SyncResult {
  return {
    sourceId: source._id,
    sourceName: source.name,
    discovered: 0,
    processed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    needsBrowser: source.kind === "web",
    qualitySampleSize: 0,
    missingDescriptionRate: 0,
    missingAuthorRate: 0,
    missingImageRate: 0,
  };
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
