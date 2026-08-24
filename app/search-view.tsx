"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleCard } from "./article-card";
import type { Article } from "./article-types";

export function SearchView({
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
  onOpenSource,
}: {
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlQuery = searchParams.get("q") ?? "";
  const urlTopic = searchParams.get("topic");
  const [query, setQuery] = useState(urlQuery);
  const [topic, setTopic] = useState<string | null>(urlTopic);
  const backfillSearch = useMutation(api.articles.backfillSearch);
  const sources = useQuery(api.sources.list, {});
  const normalized = query.trim();
  const articles = useQuery(
    api.articles.search,
    normalized.length >= 2
      ? { query: normalized, topic: topic ?? undefined, limit: 30 }
      : "skip",
  ) as Article[] | undefined;

  useEffect(() => {
    setQuery(urlQuery);
    setTopic(urlTopic);
  }, [urlQuery, urlTopic]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (normalized) params.set("q", normalized);
      if (topic) params.set("topic", topic);
      const next = params.toString();
      if (next !== searchParamsKey) {
        router.replace(`/search${next ? `?${next}` : ""}`, { scroll: false });
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [normalized, router, searchParamsKey, topic]);

  useEffect(() => {
    let cancelled = false;

    async function runBackfill() {
      for (let attempt = 0; attempt < 20 && !cancelled; attempt += 1) {
        const result = await backfillSearch({});
        if (result.done) break;
      }
    }

    void runBackfill().catch(() => {
      // Title search remains available if a background search-index backfill fails.
    });

    return () => {
      cancelled = true;
    };
  }, [backfillSearch]);

  const topics = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((source) => source.category)));
  }, [sources]);

  const matchedSources = useMemo(() => {
    if (!sources || normalized.length < 2) return [];
    const needle = normalized.toLowerCase();
    return sources.filter((source) => {
      const matchesTopic = !topic || source.category === topic;
      const matchesText =
        source.name.toLowerCase().includes(needle) ||
        source.category.toLowerCase().includes(needle);
      return matchesTopic && matchesText;
    });
  }, [normalized, sources, topic]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <SearchIcon />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles, authors, sources, topics"
          aria-label="Search Findit"
          className="h-14 w-full rounded-2xl border border-white/12 bg-white/[0.055] pl-12 pr-4 text-[15px] text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={topic === null} label="All" onClick={() => setTopic(null)} />
        {topics.map((item) => (
          <FilterChip
            key={item}
            active={topic === item}
            label={item}
            onClick={() => setTopic(item)}
          />
        ))}
      </div>

      {normalized.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-5 py-12 text-center">
          <p className="text-sm font-medium text-white/65">Search Findit</p>
          <p className="mt-1 text-xs leading-5 text-white/32">
            Search titles, descriptions, authors, sources, and topics. Your search is kept in the URL so it can be reloaded or shared.
          </p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/36">Articles</h2>
              {articles && <span className="text-[11px] text-white/25">{articles.length}</span>}
            </div>

            {articles === undefined ? (
              <SearchSkeleton />
            ) : articles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
                No matching articles
              </div>
            ) : (
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
            )}
          </section>

          {matchedSources.length > 0 && (
            <section className="pt-1">
              <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/36">Sources</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {matchedSources.map((source) => (
                  <button
                    key={source._id}
                    type="button"
                    onClick={() => onOpenSource(source._id)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.06]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-cyan-100/75">
                      {source.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/82">{source.name}</p>
                      <p className="mt-0.5 text-xs text-white/30">{source.category}</p>
                    </div>
                    <span className="text-xs text-white/28">→</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-xs transition ${
        active
          ? "border-cyan-300/45 bg-cyan-300 text-zinc-950"
          : "border-white/10 bg-white/[0.035] text-white/50 hover:text-white/75"
      }`}
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/35"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid gap-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.025]" />
      ))}
    </div>
  );
}
