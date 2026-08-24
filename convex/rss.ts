"use node";

import * as cheerio from "cheerio";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const USER_AGENT =
  "FinditBot/0.1 (+https://findit-gamma-steel.vercel.app; tech-news-indexer)";
const SUMMARY_LIMIT = 600;

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

export const syncSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    sourceName: v.string(),
    feedUrl: v.string(),
    category: v.string(),
    maxArticles: v.optional(v.number()),
  },
  returns: syncResultValidator,
  handler: async (ctx, args) => {
    const feedUrl = args.feedUrl.trim();
    if (!feedUrl) throw new Error("RSS source is missing feedUrl.");

    const xml = await fetchFeed(feedUrl);
    const entries = parseFeed(xml, feedUrl, bounded(args.maxArticles ?? 6, 1, 15));
    const stored = await ctx.runMutation(internal.articles.ingestBatch, {
      sourceId: args.sourceId,
      sourceName: args.sourceName,
      entries: entries.map((entry) => ({
        ...entry,
        canonicalUrl: entry.url,
        topic: args.category,
      })),
    });

    return {
      sourceId: args.sourceId,
      sourceName: args.sourceName,
      discovered: entries.length,
      processed: entries.length,
      created: stored.created,
      updated: stored.updated,
      unchanged: stored.unchanged,
      skipped: 0,
      needsBrowser: false,
      qualitySampleSize: stored.qualitySampleSize,
      ...(stored.latestArticleAt ? { latestArticleAt: stored.latestArticleAt } : {}),
      missingDescriptionRate: stored.missingDescriptionRate,
      missingAuthorRate: stored.missingAuthorRate,
      missingImageRate: stored.missingImageRate,
    };
  },
});

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

type FeedEntry = {
  title: string;
  url: string;
  publishedAt: number;
  description?: string;
  externalId?: string;
  author?: string;
  imageUrl?: string;
};

function parseFeed(xml: string, feedUrl: string, limit: number): FeedEntry[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const nodes = $("item").length > 0 ? $("item") : $("entry");
  const entries: FeedEntry[] = [];

  nodes.slice(0, limit).each((_, element) => {
    const node = $(element);
    const rawLink = firstNonEmpty(
      node.find("link[rel='alternate']").first().attr("href"),
      node.find("link[href]").first().attr("href"),
      node.find("link").first().text(),
    );
    const url = normalizeUrl(rawLink, feedUrl);
    const title = cleanText(node.find("title").first().text());
    if (!url || title.length < 2) return;

    const descriptionRaw = firstNonEmpty(
      node.find("description").first().text(),
      node.find("summary").first().text(),
      node.find("content\\:encoded").first().text(),
      node.find("content").first().text(),
    );
    const publishedRaw = firstNonEmpty(
      node.find("pubDate").first().text(),
      node.find("published").first().text(),
      node.find("updated").first().text(),
      node.find("dc\\:date").first().text(),
    );
    const authorRaw = firstNonEmpty(
      node.find("author > name").first().text(),
      node.find("author").first().text(),
      node.find("dc\\:creator").first().text(),
    );
    const externalId = firstNonEmpty(
      node.find("guid").first().text(),
      node.find("id").first().text(),
    );
    const imageUrl = normalizeUrl(
      firstNonEmpty(
        node.find("media\\:content").first().attr("url"),
        node.find("media\\:thumbnail").first().attr("url"),
        node.find("enclosure[type^='image/']").first().attr("url"),
      ),
      feedUrl,
    );

    const description = descriptionRaw
      ? stripMarkup(descriptionRaw).slice(0, SUMMARY_LIMIT)
      : undefined;

    entries.push({
      title: title.slice(0, 500),
      url,
      publishedAt: parseDate(publishedRaw) ?? Date.now(),
      description: description || undefined,
      externalId: externalId?.slice(0, 500),
      author: authorRaw ? cleanText(authorRaw).slice(0, 200) : undefined,
      imageUrl,
    });
  });

  return entries;
}

function stripMarkup(value: string) {
  return cleanText(cheerio.load(value, null, false).text());
}

function normalizeUrl(value: string | undefined, baseUrl: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim(), baseUrl);
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

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
