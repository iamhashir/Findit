"use client";

import { useState, type UIEvent } from "react";
import type { Id } from "../convex/_generated/dataModel";
import type { Article } from "./article-types";

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
  const [progress, setProgress] = useState(0);
  const body = article.content?.trim() || article.description?.trim();
  const readingMinutes = body
    ? Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 220))
    : null;

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
      // A canceled share sheet needs no UI error.
    }
  }

  function updateProgress(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const scrollable = target.scrollHeight - target.clientHeight;
    setProgress(scrollable > 0 ? Math.min(1, target.scrollTop / scrollable) : 1);
  }

  return (
    <div className="app-canvas fixed inset-0 z-[70] text-white">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
        <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#070809]/86 px-4 py-3 backdrop-blur-2xl sm:px-6">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-cyan-300/75 transition-transform duration-150"
            style={{ transform: `scaleX(${progress})` }}
          />
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-xl px-3 py-2 text-sm font-medium text-white/58 hover:bg-white/[0.05] hover:text-white"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSaved(article._id)}
              className={`pressable rounded-xl px-3 py-2 text-xs font-semibold ${
                saved
                  ? "bg-cyan-300 text-zinc-950"
                  : "border border-white/[0.08] bg-white/[0.025] text-white/48 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="pressable rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-semibold text-white/48 hover:bg-white/[0.06] hover:text-white"
            >
              {shared ? "Copied" : "Share"}
            </button>
          </div>
        </header>

        <div onScroll={updateProgress} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
          <article className="page-enter mx-auto max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/32">
              {onOpenSource ? (
                <button
                  type="button"
                  onClick={onOpenSource}
                  className="font-semibold uppercase tracking-[0.13em] text-cyan-100/70 transition hover:text-cyan-50"
                >
                  {article.sourceName}
                </button>
              ) : (
                <span className="font-semibold uppercase tracking-[0.13em] text-cyan-100/70">
                  {article.sourceName}
                </span>
              )}
              {article.topic ? <span>· {article.topic}</span> : null}
              <span>· {formatFullDate(article.publishedAt)}</span>
            </div>

            <h1 className="mt-5 text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.052em] text-white/96 sm:text-[3rem]">
              {article.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/34 sm:text-sm">
              {article.author ? <span className="font-medium text-white/48">By {article.author}</span> : null}
              {readingMinutes ? <span>{readingMinutes} min read</span> : null}
              {typeof article.score === "number" ? <span>▲ {article.score}</span> : null}
              {typeof article.commentCount === "number" ? <span>{article.commentCount} comments</span> : null}
            </div>

            {article.imageUrl ? (
              <div
                aria-hidden="true"
                className="mt-8 aspect-[16/9] w-full rounded-[1.55rem] border border-white/[0.08] bg-cover bg-center shadow-[0_22px_70px_rgba(0,0,0,0.2)]"
                style={{ backgroundImage: `url(${JSON.stringify(article.imageUrl).slice(1, -1)})` }}
              />
            ) : null}

            {body ? (
              <div className="mt-9 text-[16px] leading-[1.9] text-white/70 sm:text-[17px]">
                {body.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`} className="mb-6 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="mt-9 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.018] p-5 text-sm leading-6 text-white/40">
                <p className="font-medium text-white/58">Reader text is unavailable for this source.</p>
                <p className="mt-1">
                  Findit has the story metadata. Open the original publication to continue reading.
                </p>
              </div>
            )}

            <div className="mt-12 rounded-[1.6rem] border border-white/[0.08] bg-gradient-to-br from-cyan-200/[0.055] to-white/[0.018] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-[10px] font-bold text-cyan-50/65">
                  {article.sourceName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/30">Original source</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white/70">{article.sourceName}</p>
                  <p className="mt-1 text-xs leading-5 text-white/28">
                    Continue on the publisher’s site for the canonical story, updates and source context.
                  </p>
                </div>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="pressable mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-100"
              >
                View original ↗
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function formatFullDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
