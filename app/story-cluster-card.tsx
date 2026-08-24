"use client";

import Image from "next/image";
import { Bookmark, ChevronDown, MessageCircle, MoveUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { formatDate } from "./article-card";
import type { Article, StoryCluster } from "./article-types";
import { SourceAvatar } from "./source-avatar";

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
  const saved = savedSet.has(primary._id);
  const allRead = cluster.articles.every((article) => readSet.has(article._id));
  const hnArticle = cluster.articles.find(isHackerNews);

  return (
    <motion.article
      layout
      className={`group overflow-hidden border transition-opacity ${
        featured
          ? "rounded-2xl border-white/[0.09] bg-[#111111]"
          : "my-2 rounded-xl border-white/[0.075] bg-white/[0.018]"
      } ${allRead ? "opacity-60" : "opacity-100"}`}
    >
      <div className={featured && primary.imageUrl ? "grid md:grid-cols-[1.18fr_0.82fr]" : ""}>
        <div className={featured ? "flex min-h-[310px] flex-col p-5 sm:p-7" : "p-4 sm:p-5"}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/33">
                <span className="rounded-md bg-white/[0.07] px-2 py-1 font-medium text-white/58">
                  {cluster.sourceCount} sources
                </span>
                {primary.topic ? <span>{primary.topic}</span> : null}
                <span>·</span>
                <span>{formatDate(cluster.latestAt)}</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenArticle(primary)}
                className={`${featured ? "mt-7 sm:mt-9" : "mt-3"} block w-full text-left`}
              >
                <h2
                  className={`font-bold tracking-[-0.045em] text-white/91 transition group-hover:text-white ${
                    featured ? "text-[1.75rem] leading-[1.08] sm:text-[2.35rem]" : "text-xl leading-7 sm:text-[1.35rem]"
                  }`}
                >
                  {primary.title}
                </h2>
                {primary.description ? (
                  <p className={`mt-3 text-white/40 ${featured ? "line-clamp-3 text-sm leading-6 sm:text-[15px]" : "line-clamp-2 text-sm leading-5.5"}`}>
                    {primary.description}
                  </p>
                ) : null}
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggleSaved(primary._id)}
              aria-label={saved ? "Remove primary story from saved" : "Save primary story"}
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition ${
                saved
                  ? "border-white bg-white text-zinc-950"
                  : "border-white/[0.08] text-white/35 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
            </motion.button>
          </div>

          <div className={`${featured ? "mt-auto pt-7" : "mt-4"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2">
                {cluster.articles.slice(0, 5).map((article) => (
                  <button
                    key={article._id}
                    type="button"
                    onClick={() => onOpenSource(article.sourceId)}
                    title={article.sourceName}
                    className="rounded-[10px] border-2 border-[#111111] transition hover:z-10 hover:-translate-y-0.5"
                  >
                    <SourceAvatar url={article.url} name={article.sourceName} size="sm" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {hnArticle && typeof hnArticle.commentCount === "number" ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/30">
                    <MessageCircle className="size-3.5" /> {hnArticle.commentCount}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenArticle(primary)}
                  aria-label="Open primary story"
                  className={`${featured ? "flex" : "hidden sm:flex"} size-9 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:scale-[1.04] hover:bg-zinc-200`}
                >
                  <MoveUpRight className="size-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-4 flex w-full items-center justify-between border-t border-white/[0.07] pt-3 text-xs font-medium text-white/38 transition hover:text-white/70"
              aria-expanded={expanded}
            >
              <span>{expanded ? "Hide coverage" : `Compare coverage · ${cluster.articles.length}`}</span>
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="size-4" />
              </motion.span>
            </button>
          </div>
        </div>

        {featured && primary.imageUrl ? (
          <div className="relative min-h-[250px] overflow-hidden border-t border-white/[0.07] md:min-h-full md:border-l md:border-t-0">
            <Image
              src={primary.imageUrl}
              alt=""
              fill
              unoptimized
              priority
              sizes="(max-width: 768px) 100vw, 380px"
              className="object-cover transition duration-500 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.07] bg-black/15 p-2 sm:p-3">
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
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
  return (
    <div className={`group/row flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04] ${read ? "opacity-55" : ""}`}>
      <button type="button" onClick={() => onOpenSource(article.sourceId)} className="shrink-0">
        <SourceAvatar url={article.url} name={article.sourceName} size="sm" />
      </button>
      <button type="button" onClick={() => onOpenArticle(article)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5 text-[10px] text-white/28">
          <span className="font-medium text-white/48">{article.sourceName}</span>
          <span>·</span>
          <span>{primary ? "Primary" : isHackerNews(article) ? "Discussion" : "Coverage"}</span>
          <span>·</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-medium text-white/70 transition group-hover/row:text-white">
          {article.title}
        </p>
      </button>
      <MoveUpRight className="size-4 shrink-0 text-white/18 transition group-hover/row:text-white/48" />
    </div>
  );
}

function isHackerNews(article: Article) {
  return article.sourceName.toLowerCase().includes("hacker news");
}
