"use node";

import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const syncResultValidator = v.object({
  sourceId: v.id("sources"),
  sourceName: v.string(),
  discovered: v.number(),
  processed: v.number(),
  created: v.number(),
  updated: v.number(),
  skipped: v.number(),
  needsBrowser: v.boolean(),
});

type SyncResult = {
  sourceId: Id<"sources">;
  sourceName: string;
  discovered: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  needsBrowser: boolean;
};

const rssSyncSource = (anyApi as any).rss.syncSource as FunctionReference<
  "action",
  "internal",
  { sourceId: Id<"sources">; maxArticles?: number },
  SyncResult
>;

const hackerNewsSyncSource = (anyApi as any).hackerNews.syncSource as FunctionReference<
  "action",
  "internal",
  { sourceId: Id<"sources">; maxArticles?: number },
  SyncResult
>;

const scrapeSource = (anyApi as any).scraper.scrapeSource as FunctionReference<
  "action",
  "public",
  { sourceId: Id<"sources">; maxArticles?: number },
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

    return await syncOneSourceTracked(ctx, source, args.maxArticles ?? 8);
  },
});

export const syncAll = action({
  args: {
    maxSources: v.optional(v.number()),
    maxArticlesPerSource: v.optional(v.number()),
  },
  returns: v.array(syncResultValidator),
  handler: async (ctx, args) => {
    const maxSources = bounded(args.maxSources ?? 20, 1, 50);
    const maxArticles = bounded(args.maxArticlesPerSource ?? 4, 1, 15);
    const sources = await ctx.runQuery(internal.sources.listEnabledInternal, {
      limit: maxSources,
    });

    const results: SyncResult[] = [];
    for (let index = 0; index < sources.length; index += 5) {
      const batch = sources.slice(index, index + 5);
      const batchResults = await Promise.all(
        batch.map(async (source) => {
          try {
            return await syncOneSourceTracked(ctx, source, maxArticles);
          } catch {
            return {
              sourceId: source._id,
              sourceName: source.name,
              discovered: 0,
              processed: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              needsBrowser: source.kind === "web",
            } satisfies SyncResult;
          }
        }),
      );
      results.push(...batchResults);
    }

    return results;
  },
});

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
      maxArticles: bounded(maxArticles, 1, 25),
    });
  }

  if (
    source.kind === "api" &&
    (source.slug === "hacker-news" || source.apiUrl?.includes("hacker-news.firebaseio.com"))
  ) {
    return await ctx.runAction(hackerNewsSyncSource, {
      sourceId: source._id,
      maxArticles: bounded(maxArticles, 1, 25),
    });
  }

  return await ctx.runAction(scrapeSource, {
    sourceId: source._id,
    maxArticles: bounded(maxArticles, 1, 20),
  });
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
