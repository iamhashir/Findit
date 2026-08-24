"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  Home,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster, toast } from "sonner";
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

type NavItem = {
  view: MainView;
  href: string;
  label: string;
  icon: typeof Home;
};

const NAV_ITEMS: NavItem[] = [
  { view: "home", href: "/", label: "Home", icon: Home },
  { view: "search", href: "/search", label: "Search", icon: Search },
  { view: "saved", href: "/saved", label: "Saved", icon: Bookmark },
];

export function MainApp({ view }: { view: MainView }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reading = useReadingState();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSettingsOpen(false);
        router.push("/search");
      }
      if (event.key === "Escape") setSettingsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  function openArticle(article: Article) {
    reading.markRead(article._id);
    router.push(`/article/${article._id}`);
  }

  function openSource(sourceId: Id<"sources">) {
    router.push(`/source/${sourceId}`);
  }

  function toggleSaved(id: Id<"articles">) {
    const removing = reading.savedSet.has(id);
    reading.toggleSaved(id);
    toast(removing ? "Removed from saved" : "Saved", { duration: 1500 });
  }

  return (
    <main className="app-canvas min-h-screen text-white">
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#171717",
            border: "1px solid rgba(255,255,255,.1)",
            color: "#f5f5f5",
          },
        }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[1480px]">
        <DesktopSidebar
          activeView={view}
          savedCount={reading.savedIds.length}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="min-w-0 flex-1">
          <MobileHeader view={view} onOpenSettings={() => setSettingsOpen(true)} />

          <div className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {view === "home" ? (
                  <HomeView
                    savedSet={reading.savedSet}
                    readSet={reading.readSet}
                    onOpenArticle={openArticle}
                    onToggleSaved={toggleSaved}
                    onOpenSource={openSource}
                  />
                ) : null}
                {view === "search" ? (
                  <SearchView
                    savedSet={reading.savedSet}
                    readSet={reading.readSet}
                    onOpenArticle={openArticle}
                    onToggleSaved={toggleSaved}
                    onOpenSource={openSource}
                  />
                ) : null}
                {view === "saved" ? (
                  <SavedView
                    savedIds={reading.savedIds}
                    savedSet={reading.savedSet}
                    readSet={reading.readSet}
                    onOpenArticle={openArticle}
                    onToggleSaved={toggleSaved}
                    onOpenSource={openSource}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <MobileBottomNav activeView={view} savedCount={reading.savedIds.length} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function DesktopSidebar({
  activeView,
  savedCount,
  onOpenSettings,
}: {
  activeView: MainView;
  savedCount: number;
  onOpenSettings: () => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-white/[0.07] px-5 py-7 lg:flex lg:flex-col">
      <Link href="/" className="px-2 text-[22px] font-bold tracking-[-0.055em] text-white">
        Findit
      </Link>

      <nav className="mt-9 space-y-1" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = item.view === activeView;
          const Icon = item.icon;
          return (
            <Link
              key={item.view}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-white/45 hover:bg-white/[0.045] hover:text-white/80"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="desktop-nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.075]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon className="relative size-[18px]" strokeWidth={1.9} />
              <span className="relative">{item.label}</span>
              {item.view === "saved" && savedCount > 0 ? (
                <span className="relative ml-auto rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] tabular-nums text-white/55">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-white/[0.06] pt-5">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/45 transition hover:bg-white/[0.045] hover:text-white/80"
        >
          <Settings2 className="size-[18px]" strokeWidth={1.9} />
          Sources
        </button>
      </div>

      <div className="mt-auto px-2 pb-1">
        <Link
          href="/search"
          className="flex items-center justify-between rounded-lg text-xs text-white/28 transition hover:text-white/55"
        >
          <span>Quick search</span>
          <kbd className="rounded-md border border-white/[0.08] bg-white/[0.035] px-1.5 py-1 font-sans text-[10px] text-white/35">
            ⌘ K
          </kbd>
        </Link>
      </div>
    </aside>
  );
}

function MobileHeader({ view, onOpenSettings }: { view: MainView; onOpenSettings: () => void }) {
  const title = view === "home" ? "Findit" : view === "search" ? "Search" : "Saved";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.065] bg-[#0a0a0a]/92 px-4 backdrop-blur-xl lg:hidden">
      <Link href="/" className="text-lg font-bold tracking-[-0.05em] text-white">
        {title}
      </Link>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Manage sources"
        className="flex size-9 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white"
      >
        <SlidersHorizontal className="size-[18px]" />
      </button>
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
    <section>
      <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.055em] text-white sm:text-[2.35rem]">Top stories</h1>
          <p className="mt-1 text-sm text-white/38">Updated from your enabled sources.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex rounded-lg bg-white/[0.045] p-1">
            <FeedTab active={mode === "latest"} label="Latest" onClick={() => setMode("latest")} />
            <FeedTab active={mode === "trending"} label="Trending" onClick={() => setMode("trending")} />
          </div>
          <button
            type="button"
            onClick={() => setUnreadOnly((current) => !current)}
            className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${
              unreadOnly
                ? "border-white/16 bg-white/10 text-white"
                : "border-white/[0.075] text-white/43 hover:bg-white/[0.045] hover:text-white/75"
            }`}
          >
            {unreadOnly ? <Check className="size-3.5" /> : null}
            Unread
          </button>
        </div>
      </div>

      <div className="sticky top-14 z-20 -mx-4 border-b border-white/[0.06] bg-[#0a0a0a]/94 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TopicChip active={topic === null} label="All" onClick={() => setTopic(null)} />
          {topics.map((item) => (
            <TopicChip key={item} active={topic === item} label={item} onClick={() => setTopic(item)} />
          ))}
        </div>
      </div>

      <div className="pt-3">
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
      </div>
    </section>
  );
}

function FeedTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-7 rounded-md px-3 text-xs font-medium transition ${active ? "text-white" : "text-white/38 hover:text-white/70"}`}
    >
      {active ? (
        <motion.span
          layoutId="feed-mode-active"
          className="absolute inset-0 rounded-md bg-white/[0.09] shadow-sm"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      ) : null}
      <span className="relative">{label}</span>
    </button>
  );
}

function TopicChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? "text-zinc-950" : "text-white/40 hover:bg-white/[0.045] hover:text-white/75"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="topic-active"
          className="absolute inset-0 rounded-lg bg-white"
          transition={{ type: "spring", stiffness: 450, damping: 34 }}
        />
      ) : null}
      <span className="relative">{label}</span>
    </button>
  );
}

function MobileBottomNav({ activeView, savedCount }: { activeView: MainView; savedCount: number }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#0b0b0b]/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const active = item.view === activeView;
          const Icon = item.icon;
          return (
            <Link
              key={item.view}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${
                active ? "text-white" : "text-white/34"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-x-3 inset-y-1 rounded-xl bg-white/[0.065]"
                  transition={{ type: "spring", stiffness: 430, damping: 34 }}
                />
              ) : null}
              <Icon className="relative size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="relative">{item.label}</span>
              {item.view === "saved" && savedCount > 0 ? (
                <span className="absolute right-[27%] top-1.5 min-w-4 rounded-full bg-white px-1 text-center text-[9px] font-bold leading-4 text-zinc-950">
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

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label="Close source settings"
            className="absolute inset-0 bg-black/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Source settings"
            className="absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col border-l border-white/[0.09] bg-[#101010] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 text-sm font-medium text-white/55 transition hover:text-white sm:hidden"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
              <h2 className="hidden text-sm font-semibold text-white/85 sm:block">Sources</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <SourceManager />
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function FeedLoading() {
  return (
    <div className="space-y-3">
      <div className="h-[360px] animate-pulse rounded-2xl bg-white/[0.035]" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-32 animate-pulse border-b border-white/[0.06] bg-white/[0.012]" />
      ))}
    </div>
  );
}

function LazyViewLoading() {
  return (
    <div className="space-y-4 py-2">
      <div className="h-16 animate-pulse rounded-xl bg-white/[0.035]" />
      <div className="h-48 animate-pulse rounded-xl bg-white/[0.025]" />
    </div>
  );
}
