"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function ArticleFeed() {
  const articles = useQuery(api.articles.listLatest, { limit: 30 });

  if (articles === undefined) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
        No articles yet. Sync sources in Settings.
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.07]">
      {articles.map((article) => (
        <a
          key={article._id}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="block px-1 py-4 transition hover:bg-white/[0.025] sm:px-2"
        >
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <span>{article.sourceName}</span>
            <span>·</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold leading-6 tracking-[-0.02em] text-white/90 sm:text-lg">
            {article.title}
          </h3>
          {article.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-white/40">
              {article.description}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));

  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
