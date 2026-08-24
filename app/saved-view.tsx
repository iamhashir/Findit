"use client";

import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";

export function SavedView({
  savedIds,
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
}: {
  savedIds: Id<"articles">[];
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  const articles = useQuery(
    api.articles.getMany,
    savedIds.length > 0 ? { ids: savedIds.slice(0, 100) } : "skip",
  ) as Article[] | undefined;

  if (savedIds.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] px-6 py-16 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45">
          <BookmarkIcon />
        </div>
        <h2 className="mt-4 text-base font-semibold text-white/78">Nothing saved yet</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-white/35">
          Save useful stories from Home or Search and they will stay here on this device.
        </p>
      </div>
    );
  }

  if (articles === undefined) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.025]" />
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white/80">Read later</h2>
        <span className="text-xs text-white/30">{articles.length}</span>
      </div>
      <div>
        {articles.map((article) => (
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
    </section>
  );
}

function BookmarkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" />
    </svg>
  );
}
