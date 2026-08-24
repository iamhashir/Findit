"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { ArticleFeed, type FeedMode } from "./article-feed";
import { ArticleReader } from "./article-reader";
import type { Article } from "./article-types";
import { SavedView } from "./saved-view";
import { SearchView } from "./search-view";
import { SourceManager } from "./source-manager";
import { useReadingState } from "./use-reading-state";

type View = "home" | "search" | "saved" | "settings";
type IconName = "home" | "search" | "bookmark" | "settings";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const ensureRecommended = useMutation(api.sources.ensureRecommended);
  const initialized = useRef(false);
  const reading = useReadingState();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void ensureRecommended({});
  }, [ensureRecommended]);

  function openArticle(article: Article) {
    reading.markRead(article._id);
    setSelectedArticle(article);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-32 size-80 rounded-full bg-cyan-300/[0.055] blur-[110px]" />
        <div className="absolute -right-36 top-1/3 size-80 rounded-full bg-violet-400/[0.045] blur-[120px]" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-5xl px-4 pb-32 sm:px-6 lg:px-8">
        <AppHeader view={view} onOpenSettings={() => setView("settings")} onBack={() => setView("home")} />

        <div className="mx-auto max-w-3xl py-4 sm:py-7">
          {view === "home" && (
            <HomeView
              savedSet={reading.savedSet}
              readSet={reading.readSet}
              onOpenArticle={openArticle}
              onToggleSaved={reading.toggleSaved}
            />
          )}
          {view === "search" && (
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <SearchView
                savedSet={reading.savedSet}
                readSet={reading.readSet}
                onOpenArticle={openArticle}
                onToggleSaved={reading.toggleSaved}
              />
            </section>
          )}
          {view === "saved" && (
            <SavedView
              savedIds={reading.savedIds}
              savedSet={reading.savedSet}
              readSet={reading.readSet}
              onOpenArticle={openArticle}
              onToggleSaved={reading.toggleSaved}
            />
          )}
          {view === "settings" && <SourceManager />}
        </div>
      </div>

      {view !== "settings" && (
        <BottomNav
          activeView={view}
          savedCount={reading.savedIds.length}
          onChange={setView}
        />
      )}

      {selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          saved={reading.savedSet.has(selectedArticle._id)}
          onClose={() => setSelectedArticle(null)}
          onToggleSaved={reading.toggleSaved}
        />
      )}
    </main>
  );
}

function AppHeader({
  view,
  onOpenSettings,
  onBack,
}: {
  view: View;
  onOpenSettings: () => void;
  onBack: () => void;
}) {
  const title =
    view === "home" ? "Findit" : view === "search" ? "Search" : view === "saved" ? "Saved" : "Settings";

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-white/[0.07] bg-[#050607]/86 px-4 py-3.5 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {view === "settings" && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Home"
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              ←
            </button>
          )}
          <h1 className="truncate text-xl font-semibold tracking-[-0.04em]">{title}</h1>
        </div>

        {view !== "settings" && (
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]" />
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Settings"
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 text-white/42 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Icon name="settings" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function HomeView({
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
}: {
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
}) {
  const sources = useQuery(api.sources.list, {});
  const [mode, setMode] = useState<FeedMode>("latest");
  const [topic, setTopic] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const topics = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((source) => source.category)));
  }, [sources]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          <FeedTab active={mode === "latest"} label="Latest" onClick={() => setMode("latest")} />
          <FeedTab active={mode === "trending"} label="Trending" onClick={() => setMode("trending")} />
        </div>
        <button
          type="button"
          onClick={() => setUnreadOnly((current) => !current)}
          className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
            unreadOnly
              ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
              : "border-white/10 text-white/40 hover:text-white/70"
          }`}
        >
          Unread
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TopicChip active={topic === null} label="All" onClick={() => setTopic(null)} />
        {topics.map((item) => (
          <TopicChip
            key={item}
            active={topic === item}
            label={item}
            onClick={() => setTopic(item)}
          />
        ))}
      </div>

      <ArticleFeed
        mode={mode}
        topic={topic}
        unreadOnly={unreadOnly}
        savedSet={savedSet}
        readSet={readSet}
        onOpenArticle={onOpenArticle}
        onToggleSaved={onToggleSaved}
      />
    </section>
  );
}

function FeedTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
        active ? "bg-white text-zinc-950" : "text-white/38 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function TopicChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? "border-cyan-300/40 bg-cyan-300 text-zinc-950"
          : "border-white/10 bg-white/[0.03] text-white/42 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function BottomNav({
  activeView,
  savedCount,
  onChange,
}: {
  activeView: Exclude<View, "settings">;
  savedCount: number;
  onChange: (view: View) => void;
}) {
  const items: { view: Exclude<View, "settings">; label: string; icon: IconName }[] = [
    { view: "home", label: "Home", icon: "home" },
    { view: "search", label: "Search", icon: "search" },
    { view: "saved", label: "Saved", icon: "bookmark" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-md grid-cols-3 rounded-[1.65rem] border border-white/10 bg-[#101214]/94 p-1.5 shadow-[0_-18px_55px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = item.view === activeView;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onChange(item.view)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.3rem] text-[10px] font-medium transition ${
                active ? "bg-white text-zinc-950" : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              <Icon name={item.icon} className="size-[18px]" />
              {item.label}
              {item.view === "saved" && savedCount > 0 && (
                <span
                  className={`absolute right-[28%] top-2 min-w-4 rounded-full px-1 text-[9px] leading-4 ${
                    active ? "bg-zinc-900 text-white" : "bg-cyan-300 text-zinc-950"
                  }`}
                >
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m4 10 8-6 8 6" />
        <path d="M6.5 9.5V20h11V9.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </>
    ),
    bookmark: <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
