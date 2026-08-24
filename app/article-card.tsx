"use client";

import type { Id } from "../convex/_generated/dataModel";
import type { Article } from "./article-types";

export function ArticleCard({
  article,
  saved,
  read,
  featured = false,
  onOpen,
  onToggleSaved,
  onOpenSource,
}: {
  article: Article;
  saved: boolean;
  read: boolean;
  featured?: boolean;
  onOpen: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource?: (sourceId: Id<"sources">) => void;
}) {
  if (featured) {
    return (
      <article
        className={`feed-enter group relative overflow-hidden rounded-[1.7rem] border border-cyan-200/12 bg-gradient-to-br from-cyan-200/[0.07] via-white/[0.035] to-violet-300/[0.035] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.2)] sm:p-6 ${
          read ? "opacity-70" : "opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-cyan-300/[0.07] blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/38">
              <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-cyan-100/70">
                Lead story
              </span>
              {article.topic ? <span>{article.topic}</span> : null}
              <span>·</span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>

            <button type="button" onClick={() => onOpen(article)} className="mt-4 block w-full text-left">
              <h3 className="max-w-2xl text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white/95 transition group-hover:text-cyan-50 sm:text-[2rem]">
                {article.title}
              </h3>
              {article.description ? (
                <p className="mt-3 line-clamp-3 max-w-2xl text-[14px] leading-6 text-white/48 sm:text-[15px]">
                  {article.description}
                </p>
              ) : null}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleSaved(article._id)}
            aria-label={saved ? "Remove from saved" : "Save article"}
            className={`pressable flex size-10 shrink-0 items-center justify-center rounded-2xl border ${
              saved
                ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                : "border-white/10 bg-black/15 text-white/34 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <BookmarkIcon filled={saved} />
          </button>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() => onOpenSource?.(article.sourceId)}
            disabled={!onOpenSource}
            className="pressable flex min-w-0 items-center gap-2.5 rounded-xl text-left disabled:cursor-default"
          >
            <SourceMark name={article.sourceName} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/68">{article.sourceName}</p>
              <p className="mt-0.5 text-[10px] text-white/28">
                {article.author ? article.author : read ? "Read" : "Original coverage"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpen(article)}
            className="pressable rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-100"
          >
            Open story →
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group border-b border-white/[0.065] px-1 py-4.5 transition sm:px-2 ${
        read ? "opacity-58" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <SourceMark name={article.sourceName} compact />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/32">
            {onOpenSource ? (
              <button
                type="button"
                onClick={() => onOpenSource(article.sourceId)}
                className="font-semibold text-white/55 transition hover:text-cyan-100"
              >
                {article.sourceName}
              </button>
            ) : (
              <span className="font-semibold text-white/55">{article.sourceName}</span>
            )}
            <span>·</span>
            <span>{formatDate(article.publishedAt)}</span>
            {article.topic ? (
              <>
                <span>·</span>
                <span>{article.topic}</span>
              </>
            ) : null}
          </div>

          <button type="button" onClick={() => onOpen(article)} className="mt-1.5 block w-full text-left">
            <h3 className="text-[16px] font-semibold leading-6 tracking-[-0.025em] text-white/88 transition group-hover:text-cyan-50 sm:text-[17px]">
              {article.title}
            </h3>
            {article.description ? (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-5.5 text-white/38 sm:text-sm">
                {article.description}
              </p>
            ) : null}
          </button>

          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/28">
            <div className="flex min-w-0 items-center gap-3">
              {article.author ? <span className="max-w-40 truncate">{article.author}</span> : null}
              {typeof article.score === "number" ? <span>▲ {article.score}</span> : null}
              {typeof article.commentCount === "number" ? <span>{article.commentCount} comments</span> : null}
              {read ? <span>Read</span> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleSaved(article._id)}
                aria-label={saved ? "Remove from saved" : "Save article"}
                className={`pressable flex size-8 items-center justify-center rounded-xl ${
                  saved ? "bg-cyan-300/10 text-cyan-100" : "text-white/28 hover:bg-white/[0.05] hover:text-white/65"
                }`}
              >
                <BookmarkIcon filled={saved} />
              </button>
              <button
                type="button"
                onClick={() => onOpen(article)}
                aria-label={`Read ${article.title}`}
                className="pressable flex size-8 items-center justify-center rounded-xl text-white/30 hover:bg-white/[0.05] hover:text-white/70"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SourceMark({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.025] font-bold tracking-[-0.02em] text-cyan-50/68 ${
        compact ? "mt-0.5 size-8 rounded-xl text-[9px]" : "size-10 rounded-[0.9rem] text-[10px]"
      }`}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
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
