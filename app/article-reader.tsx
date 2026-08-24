"use client";

import { useState } from "react";
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
  const body = article.content?.trim() || article.description?.trim();

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

  return (
    <div className="fixed inset-0 z-[70] bg-[#050607] text-white">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSaved(article._id)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                saved ? "bg-cyan-300 text-zinc-950" : "border border-white/10 text-white/55"
              }`}
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white"
            >
              {shared ? "Copied" : "Share"}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
          <article className="mx-auto max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
              {onOpenSource ? (
                <button
                  type="button"
                  onClick={onOpenSource}
                  className="font-semibold uppercase tracking-[0.13em] text-cyan-200/75 transition hover:text-cyan-100"
                >
                  {article.sourceName}
                </button>
              ) : (
                <span className="font-semibold uppercase tracking-[0.13em] text-cyan-200/75">
                  {article.sourceName}
                </span>
              )}
              {article.topic && <span>· {article.topic}</span>}
              <span>· {new Date(article.publishedAt).toLocaleDateString()}</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-4xl">
              {article.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/38">
              {article.author && <span>By {article.author}</span>}
              {typeof article.score === "number" && <span>▲ {article.score}</span>}
              {typeof article.commentCount === "number" && <span>{article.commentCount} comments</span>}
            </div>

            {article.imageUrl && (
              <img
                src={article.imageUrl}
                alt=""
                className="mt-7 max-h-[26rem] w-full rounded-2xl border border-white/10 object-cover"
              />
            )}

            {body ? (
              <div className="mt-8 whitespace-pre-line text-[16px] leading-8 text-white/72 sm:text-[17px]">
                {body}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-white/12 p-5 text-sm leading-6 text-white/45">
                Findit has the story metadata, but this source did not provide readable article text. Open the original source to continue reading.
              </div>
            )}

            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-100"
            >
              View original ↗
            </a>
          </article>
        </div>
      </div>
    </div>
  );
}
