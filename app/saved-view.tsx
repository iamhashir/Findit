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
  onOpenSource,
}: {
  savedIds: Id<"articles">[];
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
}) {
  const articles = useQuery(
    api.articles.getMany,
    savedIds.length > 0 ? { ids: savedIds.slice(0, 100) } : "skip",
  ) as Article[] | undefined;

  if (savedIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="px-1 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/52">Your library</p>
          <h2 className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.045em] text-white/94 sm:text-3xl">
            Worth coming back to
          </h2>
        </div>

        <div className="rounded-[1.7rem] border border-dashed border-white/10 bg-gradient-to-br from-cyan-200/[0.035] to-white/[0.015] px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-cyan-100/55">
            <BookmarkIcon />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white/72">Nothing saved yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-white/32">
            Save the stories you want to revisit. They stay here without cluttering your feed.
          </p>
        </div>
      </div>
    );
  }

  if (articles === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-[1.5rem] border border-white/8 bg-white/[0.025]" />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
        ))}
      </div>
    );
  }

  const unreadSaved = articles.filter((article) => !readSet.has(article._id)).length;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4 px-1 pt-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/52">Your library</p>
          <h2 className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.045em] text-white/94 sm:text-3xl">
            Worth coming back to
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/34">
          {articles.length} saved
        </span>
      </div>

      <div className="glass-panel flex items-center justify-between gap-4 rounded-[1.35rem] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-white/62">Reading queue</p>
          <p className="mt-0.5 text-[11px] text-white/28">
            {unreadSaved > 0 ? `${unreadSaved} still unread` : "You have opened everything here"}
          </p>
        </div>
        <div className="flex -space-x-1.5">
          {articles.slice(0, 4).map((article) => (
            <div
              key={article._id}
              title={article.sourceName}
              className="flex size-7 items-center justify-center rounded-full border-2 border-[#0b0d0e] bg-white/[0.08] text-[8px] font-bold text-cyan-50/60"
            >
              {article.sourceName.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
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
            onOpenSource={onOpenSource}
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
