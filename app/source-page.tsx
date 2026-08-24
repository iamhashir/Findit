"use client";

import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";

export function SourcePage({
  sourceId,
  savedSet,
  readSet,
  onClose,
  onOpenArticle,
  onToggleSaved,
}: {
  sourceId: Id<"sources">;
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onClose: () => void;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  const source = useQuery(api.sources.getById, { id: sourceId });
  const result = useQuery(api.articles.listBySource, { sourceId, limit: 60 }) as
    | { articles: Article[]; articleCount: number; countCapped: boolean }
    | undefined;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 size-80 rounded-full bg-cyan-300/[0.055] blur-[110px]" />
        <div className="absolute -right-32 top-1/3 size-72 rounded-full bg-violet-400/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 sm:px-6">
        <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-white/[0.07] bg-[#050607]/90 px-4 py-3.5 backdrop-blur-2xl sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            ← Back
          </button>
          {source && (
            <a
              href={source.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white"
            >
              Visit source ↗
            </a>
          )}
        </header>

        {source === undefined || result === undefined ? (
          <SourcePageSkeleton />
        ) : source === null ? (
          <div className="py-20 text-center text-sm text-white/40">Source not found.</div>
        ) : (
          <main className="py-6">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold tracking-wide text-cyan-100/80">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-white/32">
                    <span>{source.category}</span>
                    <span>·</span>
                    <span>{source.kind}</span>
                  </div>
                  <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-white/92 sm:text-3xl">
                    {source.name}
                  </h1>
                  <p className="mt-2 text-sm text-white/38">
                    {result.countCapped ? `${result.articleCount}+` : result.articleCount} indexed {result.articleCount === 1 ? "story" : "stories"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-white/82">Latest from {source.name}</h2>
                <span className="text-[11px] text-white/28">{result.articles.length} shown</span>
              </div>

              {result.articles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-white/35">
                  No indexed stories from this source yet.
                </div>
              ) : (
                <div>
                  {result.articles.map((article) => (
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
              )}
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

function SourcePageSkeleton() {
  return (
    <div className="space-y-5 py-6">
      <div className="h-36 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.025]" />
      <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.02] p-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.015]" />
        ))}
      </div>
    </div>
  );
}
