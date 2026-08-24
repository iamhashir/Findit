"use client";

import { ChevronDown } from "lucide-react";
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
        <div className="h-[360px] animate-pulse rounded-2xl bg-white/[0.035]" />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
        ))}
      </div>
    );
  }

  if (visibleClusters.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center border-b border-white/[0.07] text-center">
        <p className="text-sm font-medium text-white/58">
          {unreadOnly ? "You’re caught up." : "No stories in this view."}
        </p>
        <p className="mt-1 text-xs text-white/27">
          {unreadOnly ? "Turn off Unread to see everything." : "Try another topic or feed mode."}
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

      {result?.hasMore && limit < 60 ? (
        <div className="flex justify-center pt-7">
          <button
            type="button"
            onClick={() => setLimit((current) => Math.min(60, current + 15))}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-white/42 transition hover:bg-white/[0.045] hover:text-white/75"
          >
            Load more <ChevronDown className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
