"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function SourcesList() {
  const sources = useQuery(api.sources.list, {});

  if (sources === undefined) {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-white/35">
        No sources enabled
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {sources.map((source) => (
        <a
          key={source._id}
          href={source.siteUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.06]"
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
  );
}
