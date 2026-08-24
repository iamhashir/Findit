"use client";

import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  Clock3,
  Search,
  Tag,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { formatDate } from "./article-card";
import type { Article } from "./article-types";
import { SourceAvatar } from "./source-avatar";

const RECENT_SEARCHES_KEY = "findit:recent-searches";

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
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery.trim());
  const [topic, setTopic] = useState<string | null>(urlTopic);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const sources = useQuery(api.sources.list, {});
  const normalized = query.trim();
  const searchPending = normalized.length >= 2 && debouncedQuery !== normalized;
  const articles = useQuery(
    api.articles.search,
    normalized.length >= 2 && debouncedQuery.length >= 2
      ? { query: debouncedQuery, topic: topic ?? undefined, limit: 30 }
      : "skip",
  ) as Article[] | undefined;
  const visibleArticles = searchPending ? undefined : articles;

  useEffect(() => {
    setQuery(urlQuery);
    setDebouncedQuery(urlQuery.trim());
    setTopic(urlTopic);
  }, [urlQuery, urlTopic]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored) as string[]);
    } catch {
      // Ignore unavailable or malformed local storage.
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(normalized);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [normalized]);

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

  function rememberSearch(value: string) {
    const clean = value.trim();
    if (clean.length < 2) return;
    setRecentSearches((current) => {
      const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // Ignore unavailable local storage.
      }
      return next;
    });
  }

  function openArticle(article: Article) {
    rememberSearch(normalized);
    onOpenArticle(article);
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.055em] text-white sm:text-[2.35rem]">Search</h1>
          <p className="mt-1 text-sm text-white/36">Stories, sources, authors and topics.</p>
        </div>
        <kbd className="hidden rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 font-sans text-[10px] text-white/32 sm:block">
          ⌘ K
        </kbd>
      </div>

      <Command
        shouldFilter={false}
        loop
        className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111111] shadow-[0_24px_70px_rgba(0,0,0,.22)]"
      >
        <div className="flex h-14 items-center gap-3 border-b border-white/[0.075] px-4">
          <Search className="size-[18px] shrink-0 text-white/35" strokeWidth={1.9} />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search anything…"
            aria-label="Search Findit"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/27"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex size-8 items-center justify-center rounded-lg text-white/32 transition hover:bg-white/[0.06] hover:text-white"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={topic === null} label="All" onClick={() => setTopic(null)} />
          {topics.map((item) => (
            <FilterChip key={item} active={topic === item} label={item} onClick={() => setTopic(item)} />
          ))}
        </div>

        <Command.List className="max-h-[min(68vh,720px)] overflow-y-auto p-2 [scrollbar-color:rgba(255,255,255,.14)_transparent]">
          {normalized.length < 2 ? (
            <StartState
              recentSearches={recentSearches}
              topics={topics}
              onPickSearch={(value) => {
                setQuery(value);
                rememberSearch(value);
              }}
              onPickTopic={(value) => {
                setTopic(value);
                setQuery(value);
              }}
            />
          ) : null}

          {normalized.length >= 2 && visibleArticles === undefined ? <SearchSkeleton /> : null}

          {normalized.length >= 2 && visibleArticles !== undefined ? (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${debouncedQuery}:${topic ?? "all"}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.16 }}
              >
                {matchedSources.length > 0 ? (
                  <Command.Group heading="Sources" className="command-group">
                    {matchedSources.slice(0, 8).map((source) => (
                      <Command.Item
                        key={source._id}
                        value={`source:${source.name}`}
                        onSelect={() => {
                          rememberSearch(normalized);
                          onOpenSource(source._id);
                        }}
                        className="command-item"
                      >
                        <SourceAvatar url={source.siteUrl} name={source.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white/78">{source.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/31">{source.category}</p>
                        </div>
                        <ArrowUpRight className="size-4 text-white/23" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                <Command.Group heading="Stories" className="command-group">
                  {visibleArticles.length === 0 ? (
                    <div className="px-3 py-12 text-center">
                      <p className="text-sm font-medium text-white/58">No results for “{normalized}”</p>
                      <p className="mt-1 text-xs text-white/27">Try a broader query or remove the topic filter.</p>
                    </div>
                  ) : (
                    visibleArticles.map((article) => (
                      <Command.Item
                        key={article._id}
                        value={`article:${article.title}:${article.sourceName}`}
                        onSelect={() => openArticle(article)}
                        className={`command-item group/story ${readSet.has(article._id) ? "opacity-55" : ""}`}
                      >
                        <SourceAvatar url={article.url} name={article.sourceName} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[14px] font-medium leading-5 text-white/82">{article.title}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/29">
                            <span className="truncate">{article.sourceName}</span>
                            <span>·</span>
                            <span className="shrink-0">{formatDate(article.publishedAt)}</span>
                            {article.topic ? (
                              <>
                                <span>·</span>
                                <span className="truncate">{article.topic}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleSaved(article._id);
                          }}
                          aria-label={savedSet.has(article._id) ? "Remove from saved" : "Save article"}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition ${
                            savedSet.has(article._id)
                              ? "bg-white text-zinc-950"
                              : "text-white/24 opacity-100 hover:bg-white/[0.06] hover:text-white sm:opacity-0 sm:group-hover/story:opacity-100 sm:group-data-[selected=true]/story:opacity-100"
                          }`}
                        >
                          <Bookmark className="size-4" fill={savedSet.has(article._id) ? "currentColor" : "none"} />
                        </button>
                      </Command.Item>
                    ))
                  )}
                </Command.Group>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </Command.List>
      </Command>
    </section>
  );
}

function StartState({
  recentSearches,
  topics,
  onPickSearch,
  onPickTopic,
}: {
  recentSearches: string[];
  topics: string[];
  onPickSearch: (value: string) => void;
  onPickTopic: (value: string) => void;
}) {
  return (
    <div>
      {recentSearches.length > 0 ? (
        <Command.Group heading="Recent" className="command-group">
          {recentSearches.map((item) => (
            <Command.Item key={item} value={`recent:${item}`} onSelect={() => onPickSearch(item)} className="command-item">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/35">
                <Clock3 className="size-4" />
              </span>
              <span className="text-sm text-white/68">{item}</span>
            </Command.Item>
          ))}
        </Command.Group>
      ) : null}

      <Command.Group heading="Topics" className="command-group">
        {topics.slice(0, 8).map((item) => (
          <Command.Item key={item} value={`topic:${item}`} onSelect={() => onPickTopic(item)} className="command-item">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/35">
              <Tag className="size-4" />
            </span>
            <span className="text-sm text-white/68">{item}</span>
          </Command.Item>
        ))}
      </Command.Group>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
        active ? "bg-white text-zinc-950" : "text-white/38 hover:bg-white/[0.055] hover:text-white/72"
      }`}
    >
      {label}
    </button>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-1 p-1">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-xl px-3 py-3">
          <div className="size-9 animate-pulse rounded-lg bg-white/[0.045]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.045]" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}
