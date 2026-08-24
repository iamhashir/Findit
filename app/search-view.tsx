"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
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
  const sources = useQuery(api.sources.list, {});
  const normalized = query.trim();
  const articles = useQuery(
    api.articles.search,
    normalized.length >= 2
      ? { query: normalized, topic: topic ?? undefined, limit: 24 }
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
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [normalized, router, searchParamsKey, topic]);

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
        source.category.toLowerCase().includes(needle) ||
        source.tags?.some((tag) => tag.toLowerCase().includes(needle));
      return matchesTopic && matchesText;
    });
  }, [normalized, sources, topic]);

  const suggestions = topics.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="px-1 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/52">Discovery</p>
        <h2 className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.045em] text-white/94 sm:text-3xl">
          Find the signal
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/32">
          Search across stories, authors, publications and technical topics.
        </p>
      </div>

      <div className="glass-panel rounded-[1.45rem] p-2.5">
        <div className="relative">
          <SearchIcon />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AI, databases, security, Vercel…"
            aria-label="Search Findit"
            className="h-14 w-full rounded-2xl border border-white/[0.07] bg-black/20 pl-12 pr-12 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-cyan-300/35 focus:bg-black/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="pressable absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/30 hover:bg-white/[0.05] hover:text-white/70"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={topic === null} label="Everything" onClick={() => setTopic(null)} />
          {topics.map((item) => (
            <FilterChip key={item} active={topic === item} label={item} onClick={() => setTopic(item)} />
          ))}
        </div>
      </div>

      {normalized.length < 2 ? (
        <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[1.55rem] border border-white/[0.08] bg-white/[0.022] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/32">Explore</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white/82">Start with a lane</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="pressable rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/48 hover:border-cyan-300/20 hover:bg-cyan-300/[0.05] hover:text-cyan-50"
                  >
                    {item} →
                  </button>
                ))
              ) : (
                <SearchSkeleton compact />
              )}
            </div>
          </section>

          <section className="rounded-[1.55rem] border border-white/[0.08] bg-gradient-to-br from-cyan-200/[0.055] to-white/[0.018] p-5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-200/12 bg-cyan-300/[0.07] text-cyan-100/70">
              ⌕
            </div>
            <h3 className="mt-4 text-base font-semibold text-white/78">Search the highlights</h3>
            <p className="mt-1.5 text-xs leading-5 text-white/32">
              A query matches titles, summaries, authors, sources and topics without loading full article bodies.
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-7">
          {matchedSources.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/34">Sources</h2>
                <span className="text-[11px] text-white/22">{matchedSources.length}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {matchedSources.map((source) => (
                  <button
                    key={source._id}
                    type="button"
                    onClick={() => onOpenSource(source._id)}
                    className="pressable flex min-w-[12rem] shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 text-left hover:border-cyan-300/18 hover:bg-white/[0.05]"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[10px] font-bold text-cyan-100/65">
                      {source.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/72">{source.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-white/27">{source.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-1 flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/34">Stories</h2>
                <p className="mt-1 text-[11px] text-white/24">Results for “{normalized}”</p>
              </div>
              {articles ? <span className="text-[11px] text-white/22">{articles.length}</span> : null}
            </div>

            {articles === undefined ? (
              <SearchSkeleton />
            ) : articles.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.015] px-5 py-12 text-center">
                <p className="text-sm font-medium text-white/55">No matching stories</p>
                <p className="mt-1 text-xs text-white/26">Try a broader term or remove the topic filter.</p>
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
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
        active
          ? "bg-cyan-300 text-zinc-950"
          : "border border-white/[0.07] bg-white/[0.025] text-white/38 hover:bg-white/[0.05] hover:text-white/70"
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
      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/32"
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

function SearchSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <div className="h-9 w-full animate-pulse rounded-full bg-white/[0.035]" />;
  }

  return (
    <div className="grid gap-1">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
      ))}
    </div>
  );
}
