"use node";

import * as cheerio from "cheerio";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const USER_AGENT =
  "FinditBot/0.1 (+https://findit-gamma-steel.vercel.app; tech-news-indexer)";
const SUMMARY_LIMIT = 600;
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
  unchanged: v.number(),
  skipped: v.number(),
  needsBrowser: v.boolean(),
  qualitySampleSize: v.number(),
  latestArticleAt: v.optional(v.number()),
  missingDescriptionRate: v.number(),
  missingAuthorRate: v.number(),
  missingImageRate: v.number(),
});

type ScrapedArticle = {
  title: string;
  url: string;
  canonicalUrl?: string;
  publishedAt: number;
  description?: string;
  author?: string;
  imageUrl?: string;
};

export const scrapeSource = internalAction({
  args: {
    sourceId: v.id("sources"),
    sourceName: v.string(),
    siteUrl: v.string(),
    category: v.string(),
    maxArticles: v.optional(v.number()),
  },
  returns: scrapeResultValidator,
  handler: async (ctx, args) => {
    const limit = bounded(args.maxArticles ?? 4, 1, 10);
    const listingHtml = await fetchHtml(args.siteUrl);
    const candidates = discoverArticleLinks(listingHtml, args.siteUrl, limit);
    const entries: ScrapedArticle[] = [];
    let processed = 0;
    let skipped = 0;

    for (const candidateUrl of candidates) {
      try {
        const html = await fetchHtml(candidateUrl);
        processed += 1;
        const article = extractHighlight(html, candidateUrl);
        if (!article || article.title.length < 4) {
          skipped += 1;
          continue;
        }
        entries.push(article);
      } catch {
        skipped += 1;
      }
    }

    const stored = await ctx.runMutation(internal.articles.ingestBatch, {
      sourceId: args.sourceId,
      sourceName: args.sourceName,
      entries: entries.map((entry) => ({
        ...entry,
        topic: args.category,
      })),
    });

    return {
      sourceId: args.sourceId,
      sourceName: args.sourceName,
      discovered: candidates.length,
      processed,
      created: stored.created,
      updated: stored.updated,
      unchanged: stored.unchanged,
      skipped,
      needsBrowser: candidates.length === 0 || (processed > 0 && entries.length === 0),
      qualitySampleSize: stored.qualitySampleSize,
      ...(stored.latestArticleAt ? { latestArticleAt: stored.latestArticleAt } : {}),
      missingDescriptionRate: stored.missingDescriptionRate,
      missingAuthorRate: stored.missingAuthorRate,
      missingImageRate: stored.missingImageRate,
    };
  },
});

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

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
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

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

function extractHighlight(html: string, pageUrl: string): ScrapedArticle | null {
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLd($);
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
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    asString(jsonLd?.headline),
    $("article h1").first().text(),
    $("h1").first().text(),
    $("title").text(),
  );
  if (!title) return null;

  const description = firstNonEmpty(
    $("meta[property='og:description']").attr("content"),
    $("meta[name='description']").attr("content"),
    $("meta[name='twitter:description']").attr("content"),
    asString(jsonLd?.description),
    $("article p").first().text(),
  );
  const author = firstNonEmpty(
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

  return {
    title: cleanText(title).slice(0, 500),
    url: finalUrl,
    canonicalUrl: canonical,
    publishedAt: publishedAt ?? Date.now(),
    description: description ? cleanText(description).slice(0, SUMMARY_LIMIT) : undefined,
    author: author ? cleanText(author).slice(0, 200) : undefined,
    imageUrl,
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
    if (!["http:", "https:"].includes(url.protocol)) return null;
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
