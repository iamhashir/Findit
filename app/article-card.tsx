"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Bookmark,
  MessageCircle,
  MoveUpRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import type { Article } from "./article-types";
import { SourceAvatar } from "./source-avatar";

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
      <motion.article
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group overflow-hidden rounded-2xl border border-white/[0.085] bg-[#111111] ${read ? "opacity-70" : "opacity-100"}`}
      >
        <div className={article.imageUrl ? "grid md:grid-cols-[1.18fr_0.82fr]" : ""}>
          <div className="flex min-h-[300px] flex-col p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onOpenSource?.(article.sourceId)}
                disabled={!onOpenSource}
                className="flex min-w-0 items-center gap-2.5 text-left disabled:cursor-default"
              >
                <SourceAvatar url={article.url} name={article.sourceName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/72">{article.sourceName}</p>
                  <p className="mt-0.5 text-[11px] text-white/32">{formatDate(article.publishedAt)}</p>
                </div>
              </button>

              <SaveButton saved={saved} onClick={() => onToggleSaved(article._id)} />
            </div>

            <button type="button" onClick={() => onOpen(article)} className="mt-8 block text-left sm:mt-10">
              {article.topic ? (
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/36">{article.topic}</span>
              ) : null}
              <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-[1.08] tracking-[-0.052em] text-white transition group-hover:text-white/82 sm:text-[2.35rem]">
                {article.title}
              </h2>
              {article.description ? (
                <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-[15px]">
                  {article.description}
                </p>
              ) : null}
            </button>

            <div className="mt-auto flex items-end justify-between gap-4 pt-8">
              <ArticleMeta article={article} read={read} />
              <button
                type="button"
                onClick={() => onOpen(article)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:scale-[1.04] hover:bg-zinc-200"
                aria-label={`Open ${article.title}`}
              >
                <MoveUpRight className="size-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {article.imageUrl ? (
            <ArticleImage
              src={article.imageUrl}
              alt=""
              priority
              className="relative min-h-[250px] border-t border-white/[0.07] md:min-h-full md:border-l md:border-t-0"
            />
          ) : null}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      layout
      className={`group border-b border-white/[0.07] py-5 transition-opacity ${read ? "opacity-55" : "opacity-100"}`}
    >
      <div className={article.imageUrl ? "grid gap-4 sm:grid-cols-[1fr_164px]" : ""}>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <SourceAvatar url={article.url} name={article.sourceName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/32">
                {onOpenSource ? (
                  <button
                    type="button"
                    onClick={() => onOpenSource(article.sourceId)}
                    className="font-semibold text-white/58 transition hover:text-white"
                  >
                    {article.sourceName}
                  </button>
                ) : (
                  <span className="font-semibold text-white/58">{article.sourceName}</span>
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

              <button type="button" onClick={() => onOpen(article)} className="mt-2 block w-full text-left">
                <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.028em] text-white/88 transition group-hover:text-white sm:text-[18px]">
                  {article.title}
                </h3>
                {article.description ? (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-5.5 text-white/38 sm:text-sm">
                    {article.description}
                  </p>
                ) : null}
              </button>

              <div className="mt-3 flex items-center justify-between gap-3">
                <ArticleMeta article={article} read={read} />
                <div className="flex items-center gap-0.5 opacity-70 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open original article"
                    className="flex size-8 items-center justify-center rounded-lg text-white/32 transition hover:bg-white/[0.055] hover:text-white"
                  >
                    <ArrowUpRight className="size-4" />
                  </a>
                  <SaveButton saved={saved} compact onClick={() => onToggleSaved(article._id)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {article.imageUrl ? (
          <button type="button" onClick={() => onOpen(article)} className="hidden sm:block">
            <ArticleImage
              src={article.imageUrl}
              alt=""
              className="relative h-[112px] overflow-hidden rounded-xl border border-white/[0.07]"
            />
          </button>
        ) : null}
      </div>
    </motion.article>
  );
}

function ArticleMeta({ article, read }: { article: Article; read: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/28">
      {article.author ? <span className="max-w-44 truncate">{article.author}</span> : null}
      {typeof article.score === "number" ? <span>▲ {article.score}</span> : null}
      {typeof article.commentCount === "number" ? (
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3" /> {article.commentCount}
        </span>
      ) : null}
      {read ? <span>Read</span> : null}
    </div>
  );
}

function SaveButton({
  saved,
  compact = false,
  onClick,
}: {
  saved: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={saved ? "Remove from saved" : "Save article"}
      className={`flex shrink-0 items-center justify-center transition ${
        compact ? "size-8 rounded-lg" : "size-9 rounded-lg border border-white/[0.08]"
      } ${saved ? "bg-white text-zinc-950" : "text-white/36 hover:bg-white/[0.06] hover:text-white"}`}
    >
      <Bookmark className={compact ? "size-4" : "size-[17px]"} fill={saved ? "currentColor" : "none"} />
    </motion.button>
  );
}

function ArticleImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className={className}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 40vw, 360px"
        onError={() => setFailed(true)}
        className="object-cover transition duration-500 group-hover:scale-[1.025]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
    </div>
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
