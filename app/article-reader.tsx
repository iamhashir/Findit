"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  MessageCircle,
  Share2,
} from "lucide-react";
import { motion } from "motion/react";
import type { Id } from "../convex/_generated/dataModel";
import type { Article } from "./article-types";
import { SourceAvatar } from "./source-avatar";

export function ArticleReader({
  article,
  saved,
  onClose,
  onToggleSaved,
  onOpenSource,
}: {
  article: Article;
  saved: boolean;
  onClose: () => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource?: () => void;
}) {
  const [shared, setShared] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const summary = article.description?.trim();

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1600);
      }
    } catch {
      // Ignore canceled native share sheets.
    }
  }

  return (
    <main className="app-canvas min-h-screen text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0a0a0a]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Go back"
            className="flex size-9 items-center justify-center rounded-lg text-white/42 transition hover:bg-white/[0.055] hover:text-white"
          >
            <ArrowLeft className="size-[18px]" />
          </button>

          <div className="flex items-center gap-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggleSaved(article._id)}
              aria-label={saved ? "Remove from saved" : "Save article"}
              className={`flex size-9 items-center justify-center rounded-lg transition ${
                saved ? "bg-white text-zinc-950" : "text-white/40 hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
            </motion.button>
            <button
              type="button"
              onClick={() => void share()}
              aria-label="Share article"
              className="flex size-9 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.055] hover:text-white"
            >
              {shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="flex items-center gap-3">
          <SourceAvatar url={article.url} name={article.sourceName} size="md" />
          <div className="min-w-0">
            {onOpenSource ? (
              <button
                type="button"
                onClick={onOpenSource}
                className="block truncate text-xs font-semibold text-white/66 transition hover:text-white"
              >
                {article.sourceName}
              </button>
            ) : (
              <p className="truncate text-xs font-semibold text-white/66">{article.sourceName}</p>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/29">
              <span>{formatFullDate(article.publishedAt)}</span>
              {article.topic ? <><span>·</span><span>{article.topic}</span></> : null}
            </div>
          </div>
        </div>

        <h1 className="mt-7 text-[2.25rem] font-bold leading-[1.06] tracking-[-0.058em] text-white sm:text-[3.35rem]">
          {article.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/31">
          {article.author ? <span className="font-medium text-white/45">{article.author}</span> : null}
          {typeof article.score === "number" ? <span>▲ {article.score}</span> : null}
          {typeof article.commentCount === "number" ? (
            <span className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5" /> {article.commentCount}
            </span>
          ) : null}
        </div>

        {article.imageUrl && !imageFailed ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/[0.075] sm:mt-10">
            <Image
              src={article.imageUrl}
              alt=""
              fill
              unoptimized
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              onError={() => setImageFailed(true)}
              className="object-cover"
            />
          </div>
        ) : null}

        {summary ? (
          <section className="mt-9 border-l-2 border-white/16 pl-5 sm:mt-10 sm:pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/27">Summary</p>
            <p className="mt-3 text-[16px] leading-7.5 text-white/62 sm:text-[17px] sm:leading-8">{summary}</p>
          </section>
        ) : null}

        <div className="mt-10 flex flex-col gap-4 border-t border-white/[0.075] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <SourceAvatar url={article.url} name={article.sourceName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/58">{article.sourceName}</p>
              <p className="mt-0.5 text-[10px] text-white/25">Original publication</p>
            </div>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Read original <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </article>
    </main>
  );
}

function formatFullDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
