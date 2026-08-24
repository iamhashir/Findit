"use node";

import * as cheerio from "cheerio";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const DEFAULT_API_URL = "https://hacker-news.firebaseio.com/v0/";
const USER_AGENT =
  "FinditBot/0.1 (+https://findit-gamma-steel.vercel.app; tech-news-indexer)";

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

type HackerNewsItem = {
  id: number;
  by?: string;
  dead?: boolean;
  deleted?: boolean;
  descendants?: number;
  score?: number;
  text?: string;
  time?: number;
  title?: string;
  type?: string;
  url?: string;
};

export const syncSource = internalAction({
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
    if (source.kind !== "api") throw new Error("Source is not configured as API.");

    const apiBase = ensureTrailingSlash(source.apiUrl?.trim() || DEFAULT_API_URL);
    if (!apiBase.includes("hacker-news.firebaseio.com")) {
      throw new Error("Unsupported API source. Hacker News is currently the only API adapter.");
    }

    const limit = bounded(args.maxArticles ?? 8, 1, 25);
    const ids = await fetchJson<number[]>(`${apiBase}topstories.json`);
    const candidateIds = ids.slice(0, Math.min(ids.length, limit * 3));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let processed = 0;
    let accepted = 0;

    for (const id of candidateIds) {
      if (accepted >= limit) break;

      try {
        const item = await fetchJson<HackerNewsItem | null>(`${apiBase}item/${id}.json`);
        processed += 1;

        if (
          !item ||
          item.deleted ||
          item.dead ||
          item.type !== "story" ||
          !item.title?.trim()
        ) {
          skipped += 1;
          continue;
        }

        const articleUrl = normalizeUrl(item.url) ?? `https://news.ycombinator.com/item?id=${item.id}`;
        const description = item.text ? stripMarkup(item.text).slice(0, 2_000) : undefined;

        const stored = await ctx.runMutation(internal.articles.upsertScraped, {
          sourceId: source._id,
          sourceName: source.name,
          title: cleanText(item.title).slice(0, 500),
          url: articleUrl,
          canonicalUrl: articleUrl,
          publishedAt: typeof item.time === "number" ? item.time * 1_000 : Date.now(),
          description: description || undefined,
          externalId: String(item.id),
          author: item.by?.slice(0, 300),
          topic: source.category,
        });

        accepted += 1;
        if (stored.created) created += 1;
        else updated += 1;
      } catch {
        skipped += 1;
      }
    }

    return {
      sourceId: source._id,
      sourceName: source.name,
      discovered: candidateIds.length,
      processed,
      created,
      updated,
      skipped,
      needsBrowser: false,
    };
  },
});

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["ref", "source", "fbclid", "gclid"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function stripMarkup(value: string) {
  return cleanText(cheerio.load(value, null, false).text());
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
