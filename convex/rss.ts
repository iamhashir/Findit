"use node";

import * as cheerio from "cheerio";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const USER_AGENT =
  "FinditBot/0.1 (+https://findit-gamma-steel.vercel.app; tech-news-indexer)";
const MAX_CONTENT_CHARS = 40_000;

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
    if (source.kind !== "rss") throw new Error("Source is not configured as RSS.");

    const feedUrl = source.feedUrl?.trim();
    if (!feedUrl) throw new Error("RSS source is missing feedUrl.");

    const xml = await fetchFeed(feedUrl);
    const entries = parseFeed(xml, feedUrl, bounded(args.maxArticles ?? 8, 1, 25));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let processed = 0;

    for (const entry of entries) {
      try {
        processed += 1;
        if (!entry.title || !entry.url) {
          skipped += 1;
          continue;
        }

        const stored = await ctx.runMutation(internal.articles.upsertScraped, {
          sourceId: source._id,
          sourceName: source.name,
          title: entry.title,
          url: entry.url,
          canonicalUrl: entry.url,
          publishedAt: entry.publishedAt,
          description: entry.description,
          externalId: entry.externalId,
          author: entry.author,
          imageUrl: entry.imageUrl,
          content: entry.content,
          topic: source.category,
        });

        if (stored.created) created += 1;
        else updated += 1;
      } catch {
        skipped += 1;
      }
    }

    return {
      sourceId: source._id,
      sourceName: source.name,
      discovered: entries.length,
      processed,
      created,
      updated,
      skipped,
      needsBrowser: false,
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
  content?: string;
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
    );
    const contentRaw = firstNonEmpty(
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

    const description = descriptionRaw ? stripMarkup(descriptionRaw).slice(0, 2_000) : undefined;
    const content = contentRaw ? stripMarkup(contentRaw).slice(0, MAX_CONTENT_CHARS) : undefined;

    entries.push({
      title: title.slice(0, 500),
      url,
      publishedAt: parseDate(publishedRaw) ?? Date.now(),
      description: description || undefined,
      externalId: externalId?.slice(0, 1_000),
      author: authorRaw ? cleanText(authorRaw).slice(0, 300) : undefined,
      imageUrl,
      content: content && content.length >= 120 ? content : undefined,
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
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
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
