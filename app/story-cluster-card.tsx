"use client";

import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { formatDate } from "./article-card";
import type { Article, StoryCluster } from "./article-types";

export function StoryClusterCard({
  cluster,
  featured = false,
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
  onOpenSource,
}: {
  cluster: StoryCluster;
  featured?: boolean;
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
      className={`feed-enter group relative overflow-hidden border transition ${
        featured
          ? "rounded-[1.7rem] border-cyan-200/14 bg-gradient-to-br from-cyan-200/[0.075] via-white/[0.038] to-violet-300/[0.035] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.2)] sm:p-6"
          : "my-2 rounded-[1.45rem] border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"
      } ${allRead ? "opacity-65" : "opacity-100"}`}
    >
      {featured ? (
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-cyan-300/[0.08] blur-3xl" />
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/36">
            <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-2.5 py-1 font-semibold uppercase tracking-[0.11em] text-cyan-100/72">
              {featured ? "Developing story" : `${cluster.sourceCount} sources`}
            </span>
            {featured ? <span>{cluster.sourceCount} sources</span> : null}
            {primary.topic ? (
              <>
                <span>·</span>
                <span>{primary.topic}</span>
              </>
            ) : null}
            <span>·</span>
            <span>{formatDate(cluster.latestAt)}</span>
          </div>

          <button type="button" onClick={() => onOpenArticle(primary)} className="mt-3 block w-full text-left">
            <h3
              className={`font-semibold tracking-[-0.04em] text-white/93 transition group-hover:text-cyan-50 ${
                featured ? "text-[1.55rem] leading-[1.15] sm:text-[2rem]" : "text-lg leading-7 sm:text-xl"
              }`}
            >
              {primary.title}
            </h3>
            {primary.description ? (
              <p className={`mt-2 text-white/42 ${featured ? "line-clamp-3 text-[14px] leading-6 sm:text-[15px]" : "line-clamp-2 text-sm leading-6"}`}>
                {primary.description}
              </p>
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleSaved(primary._id)}
          aria-label={saved ? "Remove primary story from saved" : "Save primary story"}
          className={`pressable flex size-10 shrink-0 items-center justify-center rounded-2xl border ${
            saved
              ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
              : "border-white/10 bg-black/15 text-white/34 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <div className="relative mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cluster.articles.slice(0, 4).map((article, index) => (
          <button
            key={article._id}
            type="button"
            onClick={() => onOpenSource(article.sourceId)}
            className={`pressable shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${
              index === 0
                ? "border-white/12 bg-white/[0.06] font-semibold text-white/65"
                : "border-white/[0.08] bg-black/10 text-white/38 hover:text-white/68"
            }`}
          >
            {article.sourceName}
          </button>
        ))}
        {cluster.articles.length > 4 ? <span className="shrink-0 text-[11px] text-white/25">+{cluster.articles.length - 4}</span> : null}
      </div>

      {hnArticle ? (
        <div className="relative mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200/[0.08] bg-orange-100/[0.025] px-3 py-2 text-[11px] text-orange-50/42">
          <span className="font-semibold text-orange-50/62">HN</span>
          {typeof hnArticle.score === "number" ? <span>▲ {hnArticle.score}</span> : null}
          {typeof hnArticle.commentCount === "number" ? <span>{hnArticle.commentCount} comments</span> : null}
        </div>
      ) : null}

      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="pressable text-xs font-medium text-white/40 hover:text-white/72"
          aria-expanded={expanded}
        >
          {expanded ? "Hide coverage ↑" : `Compare coverage (${cluster.articles.length})`}
        </button>
        <button
          type="button"
          onClick={() => onOpenArticle(primary)}
          className={`pressable text-xs font-semibold ${featured ? "rounded-xl bg-white px-3.5 py-2 text-zinc-950 hover:bg-cyan-100" : "text-cyan-100/62 hover:text-cyan-100"}`}
        >
          {featured ? "Open primary →" : "Read primary →"}
        </button>
      </div>

      {expanded ? (
        <div className="relative mt-3 grid gap-2 border-t border-white/[0.06] pt-3">
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
      ) : null}
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
    <div className={`rounded-xl border border-white/[0.065] bg-black/15 p-3 ${read ? "opacity-58" : ""}`}>
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.1em] text-white/25">
        <div className="flex min-w-0 items-center gap-2">
          <span>{primary ? "Primary" : discussion ? "Discussion" : "Coverage"}</span>
          <span>·</span>
          <button
            type="button"
            onClick={() => onOpenSource(article.sourceId)}
            className="truncate normal-case tracking-normal text-white/46 transition hover:text-white/72"
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
