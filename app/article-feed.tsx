"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article, StoryCluster } from "./article-types";
import { StoryClusterCard } from "./story-cluster-card";

export type FeedMode = "latest" | "trending";

type ClusterResult = {
  clusters: StoryCluster[];
  hasMore: boolean;
};

export function ArticleFeed({
  mode,
  topic,
  unreadOnly,
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
  onOpenSource,
}: {
  mode: FeedMode;
  topic: string | null;
  unreadOnly: boolean;
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
}) {
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    setLimit(30);
  }, [mode, topic]);

  const result = useQuery(api.articles.listClusters, {
    mode,
    limit,
    topic: topic ?? undefined,
  }) as ClusterResult | undefined;

  const visibleClusters = useMemo(() => {
    if (!result) return undefined;
    if (!unreadOnly) return result.clusters;
    return result.clusters.filter((cluster) =>
      cluster.articles.some((article) => !readSet.has(article._id)),
    );
  }, [readSet, result, unreadOnly]);

  if (visibleClusters === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-64 animate-pulse rounded-[1.7rem] border border-white/8 bg-white/[0.03]" />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
        ))}
      </div>
    );
  }

  if (visibleClusters.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.018] px-5 py-14 text-center">
        <div className="mx-auto size-2 rounded-full bg-cyan-300/65 shadow-[0_0_22px_rgba(103,232,249,0.4)]" />
        <p className="mt-4 text-sm font-medium text-white/60">
          {unreadOnly ? "You are caught up." : "Nothing here yet."}
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-white/28">
          {unreadOnly
            ? "New stories will appear here as your sources publish them."
            : "Try another topic or switch between Latest and Trending."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1">
        {visibleClusters.map((cluster, index) => {
          const featured = index === 0;
          return cluster.isCluster ? (
            <StoryClusterCard
              key={cluster.primary._id}
              cluster={cluster}
              featured={featured}
              savedSet={savedSet}
              readSet={readSet}
              onOpenArticle={onOpenArticle}
              onToggleSaved={onToggleSaved}
              onOpenSource={onOpenSource}
            />
          ) : (
            <ArticleCard
              key={cluster.primary._id}
              article={cluster.primary}
              featured={featured}
              saved={savedSet.has(cluster.primary._id)}
              read={readSet.has(cluster.primary._id)}
              onOpen={onOpenArticle}
              onToggleSaved={onToggleSaved}
              onOpenSource={onOpenSource}
            />
          );
        })}
      </div>

      {result?.hasMore && limit < 80 ? (
        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={() => setLimit((current) => Math.min(80, current + 20))}
            className="pressable rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3 text-xs font-semibold text-white/48 hover:bg-white/[0.06] hover:text-white"
          >
            Keep going ↓
          </button>
        </div>
      ) : null}
    </div>
  );
}
