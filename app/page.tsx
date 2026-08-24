"use client";

import { useState } from "react";
import { SourceFinder } from "./source-finder";
import { SourceManager } from "./source-manager";
import { SourcesList } from "./sources-list";

type View = "home" | "finder" | "settings";
type IconName = "home" | "search" | "settings" | "arrow";

export default function Home() {
  const [view, setView] = useState<View>("home");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-32 size-80 rounded-full bg-cyan-300/[0.055] blur-[110px]" />
        <div className="absolute -right-36 top-1/3 size-80 rounded-full bg-violet-400/[0.045] blur-[120px]" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-5xl px-4 pb-32 sm:px-6 lg:px-8">
        <AppHeader view={view} />

        <div className="mx-auto max-w-3xl py-4 sm:py-7">
          {view === "home" && <HomeView onOpenFinder={() => setView("finder")} />}
          {view === "finder" && <FinderView />}
          {view === "settings" && <SettingsView />}
        </div>
      </div>

      <BottomNav activeView={view} onChange={setView} />
    </main>
  );
}

function AppHeader({ view }: { view: View }) {
  const title = view === "home" ? "Findit" : view === "finder" ? "Finder" : "Settings";

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-white/[0.06] bg-[#050607]/82 px-4 py-4 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold tracking-[-0.04em]">{title}</h1>
        <div className="size-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]" />
      </div>
    </header>
  );
}

function HomeView({ onOpenFinder }: { onOpenFinder: () => void }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-semibold tracking-tight">Sources</h2>
        <button
          type="button"
          onClick={onOpenFinder}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition hover:bg-white/[0.05] hover:text-white"
        >
          Find
          <Icon name="arrow" className="size-3.5" />
        </button>
      </div>
      <SourcesList />
    </section>
  );
}

function FinderView() {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <SourceFinder />
    </section>
  );
}

function SettingsView() {
  return <SourceManager />;
}

function BottomNav({
  activeView,
  onChange,
}: {
  activeView: View;
  onChange: (view: View) => void;
}) {
  const items: { view: View; label: string; icon: IconName }[] = [
    { view: "home", label: "Home", icon: "home" },
    { view: "finder", label: "Finder", icon: "search" },
    { view: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-md grid-cols-3 rounded-[1.65rem] border border-white/10 bg-[#101214]/92 p-1.5 shadow-[0_-18px_55px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = item.view === activeView;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onChange(item.view)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.3rem] text-[10px] font-medium transition ${
                active ? "bg-white text-zinc-950" : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              <Icon name={item.icon} className="size-[18px]" />
              {item.label}
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
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
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
