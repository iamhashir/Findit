"use client";

import { Bookmark } from "lucide-react";
import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";
import { SourceAvatar } from "./source-avatar";

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
      <section className="mx-auto max-w-4xl">
        <div className="border-b border-white/[0.07] pb-5">
          <h1 className="text-3xl font-bold tracking-[-0.055em] text-white sm:text-[2.35rem]">Saved</h1>
          <p className="mt-1 text-sm text-white/36">Your reading queue.</p>
        </div>

        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/38">
            <Bookmark className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white/70">No saved stories</h2>
          <p className="mt-1 text-sm text-white/30">Use the bookmark action on any story.</p>
        </div>
      </section>
    );
  }

  if (articles === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
        ))}
      </div>
    );
  }

  const unreadSaved = articles.filter((article) => !readSet.has(article._id)).length;

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.055em] text-white sm:text-[2.35rem]">Saved</h1>
          <p className="mt-1 text-sm text-white/36">
            {articles.length} saved · {unreadSaved} unread
          </p>
        </div>
        <div className="hidden -space-x-2 sm:flex">
          {articles.slice(0, 5).map((article) => (
            <div key={article._id} title={article.sourceName} className="rounded-[10px] border-2 border-[#0a0a0a]">
              <SourceAvatar url={article.url} name={article.sourceName} size="sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2">
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
