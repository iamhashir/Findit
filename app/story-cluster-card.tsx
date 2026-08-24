"use client";

import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { formatDate } from "./article-card";
import type { Article, StoryCluster } from "./article-types";

export function StoryClusterCard({
  cluster,
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
  onOpenSource,
}: {
  cluster: StoryCluster;
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const primary = cluster.primary;
  const related = cluster.articles.filter((article) => article._id !== primary._id);
  const hnArticle = cluster.articles.find(isHackerNews);
  const saved = savedSet.has(primary._id);
  const allRead = cluster.articles.every((article) => readSet.has(article._id));

  return (
    <article
      className={`my-3 rounded-[1.5rem] border bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-4 transition sm:p-5 ${
        allRead ? "border-white/8 opacity-65" : "border-cyan-300/16"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/38">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 font-semibold uppercase tracking-[0.1em] text-cyan-100/68">
              {cluster.sourceCount} sources
            </span>
            {primary.topic && (
              <>
                <span>·</span>
                <span>{primary.topic}</span>
              </>
            )}
            <span>·</span>
            <span>{formatDate(cluster.latestAt)}</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenArticle(primary)}
            className="mt-2 block w-full text-left"
          >
            <h3 className="text-lg font-semibold leading-7 tracking-[-0.025em] text-white/92 transition hover:text-cyan-100 sm:text-xl">
              {primary.title}
            </h3>
            {primary.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-white/43">
                {primary.description}
              </p>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleSaved(primary._id)}
          aria-label={saved ? "Remove primary story from saved" : "Save primary story"}
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition ${
            saved
              ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-200"
              : "border-white/10 text-white/35 hover:border-white/20 hover:text-white"
          }`}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenSource(primary.sourceId)}
          className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-white/62 transition hover:border-cyan-300/25 hover:text-white"
        >
          {primary.sourceName}
        </button>
        {related.slice(0, 3).map((article) => (
          <button
            key={article._id}
            type="button"
            onClick={() => onOpenSource(article.sourceId)}
            className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40 transition hover:border-white/20 hover:text-white/70"
          >
            {article.sourceName}
          </button>
        ))}
        {related.length > 3 && (
          <span className="text-[11px] text-white/28">+{related.length - 3} more</span>
        )}
      </div>

      {hnArticle && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200/10 bg-orange-100/[0.035] px-3 py-2 text-[11px] text-orange-50/50">
          <span className="font-medium text-orange-50/65">Hacker News discussion</span>
          {typeof hnArticle.score === "number" && <span>▲ {hnArticle.score}</span>}
          {typeof hnArticle.commentCount === "number" && <span>{hnArticle.commentCount} comments</span>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-xs font-medium text-white/42 transition hover:text-white/75"
          aria-expanded={expanded}
        >
          {expanded ? "Hide coverage" : `View coverage (${cluster.articles.length})`}
        </button>
        <button
          type="button"
          onClick={() => onOpenArticle(primary)}
          className="text-xs font-medium text-cyan-100/62 transition hover:text-cyan-100"
        >
          Read primary →
        </button>
      </div>

      {expanded && (
        <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3">
          {cluster.articles.map((article) => (
            <CoverageRow
              key={article._id}
              article={article}
              primary={article._id === primary._id}
              read={readSet.has(article._id)}
              onOpenArticle={onOpenArticle}
              onOpenSource={onOpenSource}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function CoverageRow({
  article,
  primary,
  read,
  onOpenArticle,
  onOpenSource,
}: {
  article: Article;
  primary: boolean;
  read: boolean;
  onOpenArticle: (article: Article) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
}) {
  const discussion = isHackerNews(article);

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-black/15 p-3 ${read ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.1em] text-white/27">
        <div className="flex min-w-0 items-center gap-2">
          <span>{primary ? "Primary" : discussion ? "Discussion" : "Coverage"}</span>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenSource(article.sourceId)}
            className="truncate normal-case tracking-normal text-white/48 transition hover:text-white/75"
          >
            {article.sourceName}
          </button>
        </div>
        <span className="shrink-0 normal-case tracking-normal">{formatDate(article.publishedAt)}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpenArticle(article)}
        className="mt-1.5 block w-full text-left text-sm font-medium leading-5 text-white/72 transition hover:text-cyan-100"
      >
        {article.title}
      </button>
    </div>
  );
}

function isHackerNews(article: Article) {
  return article.sourceName.toLowerCase().includes("hacker news");
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
