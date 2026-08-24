"use client";

import { useQuery } from "convex/react";
import { anyApi } from "convex/server";

type Source = {
  _id: string;
  name: string;
  category: string;
  kind: "rss" | "api";
  siteUrl: string;
};

export function SourcesList() {
  const sources = useQuery(anyApi.sources.list) as Source[] | undefined;

  if (sources === undefined) {
    return (
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60"
          />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-400">
        Convex is connected. Seed the starting sources with
        <code className="ml-2 rounded bg-zinc-900 px-2 py-1 text-zinc-300">
          npx convex run seed:seedSources
        </code>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {sources.map((source) => (
        <a
          key={source._id}
          href={source.siteUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {source.category}
            </p>
            <span className="text-xs text-zinc-600">{source.kind.toUpperCase()}</span>
          </div>
          <h3 className="mt-2 font-medium text-zinc-100">{source.name}</h3>
        </a>
      ))}
    </div>
  );
}
