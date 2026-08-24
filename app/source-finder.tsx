"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const filters = ["All", "Engineering", "Community", "Web", "Infrastructure"];

export function SourceFinder() {
  const sources = useQuery(api.sources.list, {});
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredSources = useMemo(() => {
    if (!sources) return [];

    const normalizedQuery = query.trim().toLowerCase();

    return sources.filter((source) => {
      const matchesFilter =
        activeFilter === "All" || source.category === activeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        source.name.toLowerCase().includes(normalizedQuery) ||
        source.category.toLowerCase().includes(normalizedQuery) ||
        source.kind.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query, sources]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/40"
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
          placeholder="Search sources, topics, formats..."
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.055] pl-12 pr-4 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/50 focus:bg-white/[0.075] focus:ring-4 focus:ring-cyan-300/5"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
              activeFilter === filter
                ? "border-cyan-300/40 bg-cyan-300 text-zinc-950 shadow-[0_0_30px_rgba(103,232,249,0.18)]"
                : "border-white/10 bg-white/[0.045] text-white/60 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {sources === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-3xl border border-white/8 bg-white/[0.035]"
            />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/40">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-white/70">No matches found</p>
          <p className="mt-1 text-sm text-white/35">Try a different source or topic.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredSources.map((source) => (
            <a
              key={source._id}
              href={source.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="group rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] text-sm font-semibold text-cyan-200">
                  {source.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                  {source.kind}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight text-white">
                {source.name}
              </h3>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-white/40">{source.category}</span>
                <span className="flex items-center gap-1 text-cyan-200/70 transition group-hover:text-cyan-200">
                  Open
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
