"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";

export type FeedMode = "latest" | "trending";

export function ArticleFeed({
  mode,
  topic,
  unreadOnly,
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
}: {
  mode: FeedMode;
  topic: string | null;
  unreadOnly: boolean;
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    setLimit(30);
  }, [mode, topic]);

  const args = { limit, topic: topic ?? undefined };
  const latest = useQuery(api.articles.listLatest, mode === "latest" ? args : "skip") as
    | Article[]
    | undefined;
  const trending = useQuery(api.articles.listTrending, mode === "trending" ? args : "skip") as
    | Article[]
    | undefined;
  const articles = mode === "latest" ? latest : trending;

  const visibleArticles = useMemo(() => {
    if (!articles) return undefined;
    return unreadOnly ? articles.filter((article) => !readSet.has(article._id)) : articles;
  }, [articles, readSet, unreadOnly]);

  if (visibleArticles === undefined) {
    return (
      <div className="grid gap-3 py-1">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.025]" />
        ))}
      </div>
    );
  }

  if (visibleArticles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
        {unreadOnly ? "You have read everything in this view." : "No articles in this view yet."}
      </div>
    );
  }

  return (
    <div>
      <div>
        {visibleArticles.map((article) => (
          <ArticleCard
            key={article._id}
            article={article}
            saved={savedSet.has(article._id)}
            read={readSet.has(article._id)}
            onOpen={onOpenArticle}
            onToggleSaved={onToggleSaved}
          />
        ))}
      </div>

      {articles && articles.length >= limit && limit < 100 && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => setLimit((current) => Math.min(100, current + 20))}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
