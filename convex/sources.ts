import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
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

function sortSources<T extends { name: string; rank?: number }>(sources: T[]) {
  return sources.sort((a, b) => {
    const aRank = a.rank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.rank ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `source-${Date.now()}`;
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
        await ctx.db.patch(existing._id, {
          ...curatedFields,
          updatedAt: now,
        });
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
