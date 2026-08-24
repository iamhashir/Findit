"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function SourceFinder() {
  const sources = useQuery(api.sources.list, {});
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = useMemo(() => {
    if (!sources) return ["All"];
    return ["All", ...Array.from(new Set(sources.map((source) => source.category)))];
  }, [sources]);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return sources.filter((source) => {
      const matchesFilter = activeFilter === "All" || source.category === activeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.category.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query, sources]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-12 pr-4 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs transition ${
              activeFilter === filter
                ? "border-cyan-300/40 bg-cyan-300 text-zinc-950"
                : "border-white/10 bg-white/[0.04] text-white/50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {sources === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/35">
          No matches
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredSources.map((source) => (
            <a
              key={source._id}
              href={source.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.065]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-cyan-100/75">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-white/85">{source.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-white/30">{source.category}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/25">{source.kind}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
