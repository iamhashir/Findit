import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const supplementalSources = [
  {
    name: "Anthropic Research",
    slug: "anthropic-research",
    siteUrl: "https://www.anthropic.com/research",
    crawlUrls: ["https://www.anthropic.com/research/team/societal-impacts"],
    kind: "web" as const,
    category: "AI Research",
    quality: "primary" as const,
    priority: 1,
    rank: 2.5,
    description:
      "First-party Anthropic research, including AI safety, economics, societal impacts, and model science.",
    tags: ["AI", "research", "economics", "safety", "societal impacts"],
  },
] as const;

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

export const ensure = internalMutation({
  args: {},
  returns: v.array(
    v.object({
      sourceId: v.id("sources"),
      sourceName: v.string(),
      category: v.string(),
      enabled: v.boolean(),
      crawlUrls: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const now = Date.now();
    const existingSources = await ctx.db.query("sources").take(100);
    const bySlug = new Map(existingSources.map((source) => [source.slug, source]));
    const bySiteUrl = new Map(
      existingSources.map((source) => [normalizeSiteUrl(source.siteUrl), source]),
    );
    const targets: Array<{
      sourceId: (typeof existingSources)[number]["_id"];
      sourceName: string;
      category: string;
      enabled: boolean;
      crawlUrls: string[];
    }> = [];

    for (const source of supplementalSources) {
      const existing =
        bySlug.get(source.slug) ?? bySiteUrl.get(normalizeSiteUrl(source.siteUrl));

      if (existing) {
        targets.push({
          sourceId: existing._id,
          sourceName: existing.name,
          category: existing.category,
          enabled: existing.enabled,
          crawlUrls: [...source.crawlUrls],
        });
        continue;
      }

      const sourceId = await ctx.db.insert("sources", {
        name: source.name,
        slug: source.slug,
        siteUrl: source.siteUrl,
        kind: source.kind,
        category: source.category,
        enabled: true,
        createdAt: now,
        updatedAt: now,
        recommended: true,
        rank: source.rank,
        description: source.description,
        tags: [...source.tags],
        quality: source.quality,
        priority: source.priority,
      });

      targets.push({
        sourceId,
        sourceName: source.name,
        category: source.category,
        enabled: true,
        crawlUrls: [...source.crawlUrls],
      });
    }

    return targets;
  },
});
