"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import type { FeedMode } from "./article-feed";
import type { Article } from "./article-types";
import { useReadingState } from "./use-reading-state";

const ArticleFeed = dynamic(
  () => import("./article-feed").then((module) => module.ArticleFeed),
  { loading: FeedLoading },
);
const SearchView = dynamic(
  () => import("./search-view").then((module) => module.SearchView),
  { loading: LazyViewLoading },
);
const SavedView = dynamic(
  () => import("./saved-view").then((module) => module.SavedView),
  { loading: LazyViewLoading },
);
const SourceManager = dynamic(
  () => import("./source-manager").then((module) => module.SourceManager),
  { loading: LazyViewLoading },
);

export type MainView = "home" | "search" | "saved";
type HeaderView = MainView | "settings";
type IconName = "home" | "search" | "bookmark" | "settings";

export function MainApp({ view }: { view: MainView }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reading = useReadingState();

  function openArticle(article: Article) {
    reading.markRead(article._id);
    router.push(`/article/${article._id}`);
  }

  function openSource(sourceId: Id<"sources">) {
    router.push(`/source/${sourceId}`);
  }

  const headerView: HeaderView = settingsOpen ? "settings" : view;

  return (
    <main className="app-canvas relative min-h-screen overflow-x-hidden text-white">
      <div className="relative mx-auto min-h-screen w-full max-w-5xl px-4 pb-32 sm:px-6 lg:px-8">
        <AppHeader
          view={headerView}
          onOpenSettings={() => setSettingsOpen(true)}
          onBack={() => setSettingsOpen(false)}
        />

        <div className="page-enter mx-auto max-w-3xl py-5 sm:py-8">
          {!settingsOpen && view === "home" ? (
            <HomeView
              savedSet={reading.savedSet}
              readSet={reading.readSet}
              onOpenArticle={openArticle}
              onToggleSaved={reading.toggleSaved}
              onOpenSource={openSource}
            />
          ) : null}
          {!settingsOpen && view === "search" ? (
            <SearchView
              savedSet={reading.savedSet}
              readSet={reading.readSet}
              onOpenArticle={openArticle}
              onToggleSaved={reading.toggleSaved}
              onOpenSource={openSource}
            />
          ) : null}
          {!settingsOpen && view === "saved" ? (
            <SavedView
              savedIds={reading.savedIds}
              savedSet={reading.savedSet}
              readSet={reading.readSet}
              onOpenArticle={openArticle}
              onToggleSaved={reading.toggleSaved}
              onOpenSource={openSource}
            />
          ) : null}
          {settingsOpen ? <SourceManager /> : null}
        </div>
      </div>

      {!settingsOpen ? <BottomNav activeView={view} savedCount={reading.savedIds.length} /> : null}
    </main>
  );
}

function AppHeader({
  view,
  onOpenSettings,
  onBack,
}: {
  view: HeaderView;
  onOpenSettings: () => void;
  onBack: () => void;
}) {
  const title =
    view === "home" ? "Findit" : view === "search" ? "Search" : view === "saved" ? "Saved" : "Settings";

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-white/[0.065] bg-[#070809]/82 px-4 py-3 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {view === "settings" ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="pressable flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-white/58 hover:bg-white/[0.06] hover:text-white"
            >
              ←
            </button>
          ) : null}

          {view === "home" ? (
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/[0.08] shadow-[0_0_32px_rgba(103,232,249,0.08)]">
                <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.85)]" />
              </div>
              <div>
                <h1 className="truncate text-xl font-semibold tracking-[-0.045em] text-white/95">{title}</h1>
                <p className="-mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/25">
                  Signals for builders
                </p>
              </div>
            </div>
          ) : (
            <h1 className="truncate text-xl font-semibold tracking-[-0.04em] text-white/94">{title}</h1>
          )}
        </div>

        {view !== "settings" ? (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Settings"
            className="pressable flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-white/42 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="settings" className="size-[17px]" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function HomeView({
  savedSet,
  readSet,
  onOpenArticle,
  onToggleSaved,
  onOpenSource,
}: {
  savedSet: Set<Id<"articles">>;
  readSet: Set<Id<"articles">>;
  onOpenArticle: (article: Article) => void;
  onToggleSaved: (id: Id<"articles">) => void;
  onOpenSource: (sourceId: Id<"sources">) => void;
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
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4 px-1 pt-1">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/55">
            <span className="size-1.5 rounded-full bg-cyan-300" />
            Live feed
          </div>
          <h2 className="mt-1.5 text-[1.7rem] font-semibold leading-tight tracking-[-0.045em] text-white/94 sm:text-3xl">
            What matters now
          </h2>
        </div>
        <p className="hidden max-w-[14rem] text-right text-xs leading-5 text-white/28 sm:block">
          Source-first technology, AI and engineering coverage.
        </p>
      </div>

      <div className="glass-panel sticky top-[65px] z-20 -mx-1 rounded-[1.35rem] p-2.5 sm:mx-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-xl bg-black/25 p-1">
            <FeedTab active={mode === "latest"} label="Latest" onClick={() => setMode("latest")} />
            <FeedTab active={mode === "trending"} label="Trending" onClick={() => setMode("trending")} />
          </div>
          <button
            type="button"
            onClick={() => setUnreadOnly((current) => !current)}
            className={`pressable rounded-xl border px-3 py-2 text-xs font-medium ${
              unreadOnly
                ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                : "border-white/8 bg-white/[0.025] text-white/42 hover:bg-white/[0.05] hover:text-white/70"
            }`}
          >
            {unreadOnly ? "Unread only" : "Unread"}
          </button>
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TopicChip active={topic === null} label="Everything" onClick={() => setTopic(null)} />
          {topics.map((item) => (
            <TopicChip key={item} active={topic === item} label={item} onClick={() => setTopic(item)} />
          ))}
        </div>
      </div>

      <ArticleFeed
        mode={mode}
        topic={topic}
        unreadOnly={unreadOnly}
        savedSet={savedSet}
        readSet={readSet}
        onOpenArticle={onOpenArticle}
        onToggleSaved={onToggleSaved}
        onOpenSource={onOpenSource}
      />
    </section>
  );
}

function FeedTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pressable rounded-lg px-4 py-2 text-xs font-semibold ${
        active
          ? "bg-white/[0.11] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-white/35 hover:text-white/70"
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
      className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
        active
          ? "bg-cyan-300 text-zinc-950 shadow-[0_4px_18px_rgba(103,232,249,0.12)]"
          : "border border-white/[0.07] bg-white/[0.025] text-white/38 hover:bg-white/[0.05] hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function BottomNav({ activeView, savedCount }: { activeView: MainView; savedCount: number }) {
  const items: { view: MainView; href: string; label: string; icon: IconName }[] = [
    { view: "home", href: "/", label: "Home", icon: "home" },
    { view: "search", href: "/search", label: "Search", icon: "search" },
    { view: "saved", href: "/saved", label: "Saved", icon: "bookmark" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="glass-panel mx-auto grid max-w-sm grid-cols-3 rounded-[1.6rem] p-1.5 shadow-[0_-18px_60px_rgba(0,0,0,0.34)]">
        {items.map((item) => {
          const active = item.view === activeView;
          return (
            <Link
              key={item.view}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`pressable relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.25rem] text-[10px] font-semibold ${
                active
                  ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                  : "text-white/32 hover:bg-white/[0.04] hover:text-white/65"
              }`}
            >
              <Icon name={item.icon} className="size-[18px]" />
              {item.label}
              {active ? <span className="absolute bottom-1.5 h-0.5 w-4 rounded-full bg-cyan-300/70" /> : null}
              {item.view === "saved" && savedCount > 0 ? (
                <span className="absolute right-[25%] top-2 min-w-4 rounded-full bg-cyan-300 px-1 text-[9px] font-bold leading-4 text-zinc-950">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FeedLoading() {
  return (
    <div className="space-y-3">
      <div className="h-64 animate-pulse rounded-[1.7rem] border border-white/8 bg-white/[0.03]" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
      ))}
    </div>
  );
}

function LazyViewLoading() {
  return (
    <div className="space-y-4 py-2">
      <div className="h-20 animate-pulse rounded-[1.5rem] border border-white/8 bg-white/[0.025]" />
      <div className="h-48 animate-pulse rounded-[1.5rem] border border-white/8 bg-white/[0.02]" />
    </div>
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
