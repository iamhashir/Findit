"use client";

import type { Id } from "../convex/_generated/dataModel";
import type { Article } from "./article-types";

export function ArticleCard({
  article,
  saved,
  read,
  onOpen,
  onToggleSaved,
}: {
  article: Article;
  saved: boolean;
  read: boolean;
  onOpen: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  return (
    <article
      className={`group border-b border-white/[0.07] px-1 py-4 transition sm:px-2 ${
        read ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
            <span className="font-medium text-white/55">{article.sourceName}</span>
            {article.topic && (
              <>
                <span>·</span>
                <span>{article.topic}</span>
              </>
            )}
            <span>·</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>

          <button type="button" onClick={() => onOpen(article)} className="mt-1.5 block w-full text-left">
            <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-white/90 transition group-hover:text-cyan-100 sm:text-lg">
              {article.title}
            </h3>
            {article.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-white/42">
                {article.description}
              </p>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleSaved(article._id)}
          aria-label={saved ? "Remove from saved" : "Save article"}
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border transition ${
            saved
              ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-200"
              : "border-white/10 text-white/35 hover:border-white/20 hover:text-white"
          }`}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/30">
        <div className="flex items-center gap-3">
          {typeof article.score === "number" && <span>▲ {article.score}</span>}
          {typeof article.commentCount === "number" && <span>{article.commentCount} comments</span>}
          {read && <span>Read</span>}
        </div>
        <button
          type="button"
          onClick={() => onOpen(article)}
          className="font-medium text-white/45 transition hover:text-white"
        >
          Read →
        </button>
      </div>
    </article>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" />
    </svg>
  );
}

export function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
