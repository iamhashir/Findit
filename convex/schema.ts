import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const sourceQuality = v.union(
  v.literal("primary"),
  v.literal("expert"),
  v.literal("publication"),
  v.literal("community"),
);

export default defineSchema({
  sources: defineTable({
    name: v.string(),
    slug: v.string(),
    siteUrl: v.string(),
    feedUrl: v.optional(v.string()),
    apiUrl: v.optional(v.string()),
    kind: v.union(v.literal("rss"), v.literal("api"), v.literal("web")),
    category: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    recommended: v.optional(v.boolean()),
    rank: v.optional(v.number()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    quality: v.optional(sourceQuality),
    priority: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_enabled", ["enabled"]),

  sourceHealth: defineTable({
    sourceId: v.id("sources"),
    lastAttemptAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    consecutiveFailures: v.number(),
    totalRuns: v.number(),
    successfulRuns: v.number(),
    totalDiscovered: v.number(),
    totalCreated: v.number(),
    totalUpdated: v.number(),
    totalSkipped: v.number(),
    lastDiscovered: v.number(),
    lastCreated: v.number(),
    lastUpdated: v.number(),
    lastSkipped: v.number(),
    lastDurationMs: v.number(),
    lastNeedsBrowser: v.boolean(),
  }).index("by_source", ["sourceId"]),

  articles: defineTable({
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
  })
    .index("by_url", ["url"])
    .index("by_source", ["sourceId"])
    .index("by_published_at", ["publishedAt"])
    .index("by_topic_and_published_at", ["topic", "publishedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["topic"],
    }),

  articleSearch: defineTable({
    articleId: v.id("articles"),
    searchText: v.string(),
    topic: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_article", ["articleId"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["topic"],
    }),

  searchBackfill: defineTable({
    key: v.string(),
    cursor: v.optional(v.string()),
    done: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
