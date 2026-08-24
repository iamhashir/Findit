import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sources: defineTable({
    name: v.string(),
    slug: v.string(),
    siteUrl: v.string(),
    feedUrl: v.optional(v.string()),
    apiUrl: v.optional(v.string()),
    kind: v.union(v.literal("rss"), v.literal("api")),
    category: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_enabled", ["enabled"]),

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
  })
    .index("by_url", ["url"])
    .index("by_source", ["sourceId"])
    .index("by_published_at", ["publishedAt"]),
});
