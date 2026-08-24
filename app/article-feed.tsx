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
      <div className="grid gap-3 py-1">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.025]" />
        ))}
      </div>
    );
  }

  if (visibleClusters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
        {unreadOnly ? "You have read everything in this view." : "No articles in this view yet."}
      </div>
    );
  }

  return (
    <div>
      <div>
        {visibleClusters.map((cluster) =>
          cluster.isCluster ? (
            <StoryClusterCard
              key={cluster.primary._id}
              cluster={cluster}
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
              saved={savedSet.has(cluster.primary._id)}
              read={readSet.has(cluster.primary._id)}
              onOpen={onOpenArticle}
              onToggleSaved={onToggleSaved}
              onOpenSource={onOpenSource}
            />
          ),
        )}
      </div>

      {result?.hasMore && limit < 80 && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => setLimit((current) => Math.min(80, current + 20))}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
