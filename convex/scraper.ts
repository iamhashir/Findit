"use node";

import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { parseHTML } from "linkedom";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const USER_AGENT =
  "FinditBot/0.1 (+https://findit-gamma-steel.vercel.app; tech-news-indexer)";
const MAX_CONTENT_CHARS = 40_000;
const BLOCKED_PATH_PARTS = [
  "/about",
  "/account",
  "/author/",
  "/authors/",
  "/careers",
  "/category/",
  "/contact",
  "/events",
  "/login",
  "/privacy",
  "/search",
  "/tag/",
  "/tags/",
  "/terms",
  "/topics/",
];

const scrapeResultValidator = v.object({
  sourceId: v.id("sources"),
  sourceName: v.string(),
  discovered: v.number(),
  processed: v.number(),
  created: v.number(),
  updated: v.number(),
  skipped: v.number(),
  needsBrowser: v.boolean(),
});

type ScrapedArticle = {
  title: string;
  url: string;
  canonicalUrl?: string;
  publishedAt: number;
  description?: string;
  author?: string;
  imageUrl?: string;
  content?: string;
};

export const scrapeSource = action({
  args: {
    sourceId: v.id("sources"),
    maxArticles: v.optional(v.number()),
  },
  returns: scrapeResultValidator,
  handler: async (ctx, args) => {
    const source = await ctx.runQuery(internal.sources.getByIdInternal, {
      id: args.sourceId,
    });
    if (!source) {
      throw new Error("Source not found.");
    }

    return await scrapeOneSource(ctx, source, bounded(args.maxArticles ?? 8, 1, 20));
  },
});

export const scrapeAll = action({
  args: {
    maxSources: v.optional(v.number()),
    maxArticlesPerSource: v.optional(v.number()),
  },
  returns: v.array(scrapeResultValidator),
  handler: async (ctx, args) => {
    const maxSources = bounded(args.maxSources ?? 10, 1, 20);
    const maxArticles = bounded(args.maxArticlesPerSource ?? 6, 1, 15);
    const sources = await ctx.runQuery(internal.sources.listEnabledInternal, {
      limit: maxSources,
    });

    const results = [];
    for (const source of sources) {
      try {
        results.push(await scrapeOneSource(ctx, source, maxArticles));
      } catch {
        results.push({
          sourceId: source._id,
          sourceName: source.name,
          discovered: 0,
          processed: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          needsBrowser: true,
        });
      }
    }
    return results;
  },
});

async function scrapeOneSource(
  ctx: ActionCtx,
  source: Doc<"sources">,
  maxArticles: number,
) {
  const listingHtml = await fetchHtml(source.siteUrl);
  const candidates = discoverArticleLinks(listingHtml, source.siteUrl, maxArticles);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  let needsBrowser = candidates.length === 0;

  for (const candidateUrl of candidates) {
    try {
      const html = await fetchHtml(candidateUrl);
      const article = extractArticle(html, candidateUrl);
      processed += 1;

      if (!article || article.title.length < 4) {
        skipped += 1;
        continue;
      }

      const stored = await ctx.runMutation(internal.articles.upsertScraped, {
        sourceId: source._id,
        sourceName: source.name,
        title: article.title,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        publishedAt: article.publishedAt,
        description: article.description,
        author: article.author,
        imageUrl: article.imageUrl,
        content: article.content,
        topic: source.category,
      });

      if (stored.created) created += 1;
      else updated += 1;
    } catch {
      skipped += 1;
    }
  }

  if (processed > 0 && created + updated === 0) {
    needsBrowser = true;
  }

  return {
    sourceId: source._id,
    sourceName: source.name,
    discovered: candidates.length,
    processed,
    created,
    updated,
    skipped,
    needsBrowser,
  };
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error(`Unsupported content type for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function discoverArticleLinks(html: string, baseUrl: string, limit: number) {
  const $ = cheerio.load(html);
  const scores = new Map<string, number>();
  const base = new URL(baseUrl);

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const url = normalizeUrl(href, baseUrl);
    if (!url || !sameSite(url, base)) return;
    if (url.pathname === "/" || isBlockedPath(url.pathname)) return;

    const text = $(element).text().replace(/\s+/g, " ").trim();
    let score = 0;
    const segments = url.pathname.split("/").filter(Boolean);

    if (text.length >= 18) score += 2;
    if (text.length >= 45) score += 1;
    if (segments.length >= 2) score += 2;
    if (/\d{4}/.test(url.pathname)) score += 2;
    if ($(element).closest("article").length > 0) score += 5;
    if ($(element).closest("h1,h2,h3,h4").length > 0) score += 4;
    if ($(element).closest("[class*='post'],[class*='article'],[class*='story'],[class*='card']").length > 0) {
      score += 2;
    }
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip)$/i.test(url.pathname)) score -= 10;

    if (score >= 3) {
      const key = url.toString();
      scores.set(key, Math.max(score, scores.get(key) ?? 0));
    }
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url]) => url);
}

function extractArticle(html: string, pageUrl: string): ScrapedArticle | null {
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLd($);
  const { document } = parseHTML(html);

  let readable: ReturnType<Readability["parse"]> = null;
  try {
    readable = new Readability(document as unknown as Document).parse();
  } catch {
    readable = null;
  }

  const canonical = absoluteUrl(
    firstNonEmpty(
      $("link[rel='canonical']").attr("href"),
      $("meta[property='og:url']").attr("content"),
      asString(jsonLd?.url),
    ),
    pageUrl,
  );
  const finalUrl = normalizeUrl(canonical ?? pageUrl, pageUrl)?.toString() ?? pageUrl;

  const title = firstNonEmpty(
    readable?.title,
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    asString(jsonLd?.headline),
    $("title").text(),
  );
  if (!title) return null;

  const description = firstNonEmpty(
    readable?.excerpt,
    $("meta[property='og:description']").attr("content"),
    $("meta[name='description']").attr("content"),
    asString(jsonLd?.description),
  );

  const author = firstNonEmpty(
    readable?.byline,
    $("meta[name='author']").attr("content"),
    authorFromJsonLd(jsonLd),
  );

  const imageUrl = absoluteUrl(
    firstNonEmpty(
      $("meta[property='og:image']").attr("content"),
      $("meta[name='twitter:image']").attr("content"),
      imageFromJsonLd(jsonLd),
    ),
    pageUrl,
  );

  const publishedAt = parseDate(
    firstNonEmpty(
      $("meta[property='article:published_time']").attr("content"),
      $("meta[name='date']").attr("content"),
      $("time[datetime]").first().attr("datetime"),
      asString(jsonLd?.datePublished),
    ),
  );

  const content = cleanText(readable?.textContent ?? $("article").text()).slice(
    0,
    MAX_CONTENT_CHARS,
  );

  return {
    title: cleanText(title).slice(0, 500),
    url: finalUrl,
    canonicalUrl: canonical,
    publishedAt: publishedAt ?? Date.now(),
    description: description ? cleanText(description).slice(0, 2_000) : undefined,
    author: author ? cleanText(author).slice(0, 300) : undefined,
    imageUrl,
    content: content.length >= 120 ? content : undefined,
  };
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let match: Record<string, unknown> | null = null;

  $("script[type='application/ld+json']").each((_, element) => {
    if (match) return;
    const raw = $(element).text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const object = unwrapJsonLd(candidate);
        if (object && isArticleJsonLd(object)) {
          match = object;
          return;
        }
      }
    } catch {
      // Invalid JSON-LD is common on otherwise usable pages.
    }
  });

  return match;
}

function unwrapJsonLd(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>;
  const graph = object["@graph"];
  if (Array.isArray(graph)) {
    for (const item of graph) {
      const nested = unwrapJsonLd(item);
      if (nested && isArticleJsonLd(nested)) return nested;
    }
  }
  return object;
}

function isArticleJsonLd(value: Record<string, unknown>) {
  const type = value["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (item) =>
      typeof item === "string" &&
      ["Article", "BlogPosting", "NewsArticle", "TechArticle"].includes(item),
  );
}

function authorFromJsonLd(value: Record<string, unknown> | null) {
  if (!value) return undefined;
  const author = value.author;
  if (typeof author === "string") return author;
  if (Array.isArray(author)) {
    return author
      .map((item) =>
        item && typeof item === "object" ? asString((item as Record<string, unknown>).name) : asString(item),
      )
      .filter(Boolean)
      .join(", ");
  }
  if (author && typeof author === "object") {
    return asString((author as Record<string, unknown>).name);
  }
  return undefined;
}

function imageFromJsonLd(value: Record<string, unknown> | null) {
  if (!value) return undefined;
  const image = value.image;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return asString(image[0]);
  if (image && typeof image === "object") {
    return asString((image as Record<string, unknown>).url);
  }
  return undefined;
}

function normalizeUrl(raw: string, baseUrl: string) {
  try {
    const url = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["ref", "source", "fbclid", "gclid"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return url;
  } catch {
    return null;
  }
}

function absoluteUrl(value: string | undefined, baseUrl: string) {
  if (!value) return undefined;
  return normalizeUrl(value, baseUrl)?.toString();
}

function sameSite(candidate: URL, base: URL) {
  const candidateHost = candidate.hostname.replace(/^www\./, "");
  const baseHost = base.hostname.replace(/^www\./, "");
  return (
    candidateHost === baseHost ||
    candidateHost.endsWith(`.${baseHost}`) ||
    baseHost.endsWith(`.${candidateHost}`)
  );
}

function isBlockedPath(pathname: string) {
  const lower = pathname.toLowerCase();
  return BLOCKED_PATH_PARTS.some((part) => lower.includes(part));
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}
