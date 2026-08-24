"use client";

import { useState } from "react";
import { SourceFinder } from "./source-finder";
import { SourcesList } from "./sources-list";

type View = "home" | "finder" | "settings";

type IconName =
  | "home"
  | "search"
  | "settings"
  | "spark"
  | "arrow"
  | "bell"
  | "refresh"
  | "layout"
  | "info";

const topics = ["AI", "Web", "Cloud", "DevOps", "Security", "Open Source"];

export default function Home() {
  const [view, setView] = useState<View>("home");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 size-80 rounded-full bg-cyan-300/[0.07] blur-[100px]" />
        <div className="absolute -right-32 top-1/3 size-80 rounded-full bg-violet-400/[0.06] blur-[110px]" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-6xl px-4 pb-32 sm:px-6 lg:px-8">
        <AppHeader view={view} />

        <div className="mx-auto max-w-4xl">
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
  const labels: Record<View, { eyebrow: string; title: string }> = {
    home: { eyebrow: "Your signal", title: "Findit" },
    finder: { eyebrow: "Explore", title: "Finder" },
    settings: { eyebrow: "Your space", title: "Settings" },
  };

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/[0.06] bg-[#050607]/80 px-4 py-4 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-200/45">
            {labels[view].eyebrow}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.035em]">
            {labels[view].title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-200/80 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
            Live
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Icon name="bell" className="size-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function HomeView({ onOpenFinder }: { onOpenFinder: () => void }) {
  return (
    <div className="space-y-7 py-4 sm:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
            <Icon name="spark" className="size-3.5" />
            Signal over noise
          </div>

          <h2 className="mt-6 max-w-2xl text-[2.35rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
            Know what matters before it gets loud.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/45 sm:text-base">
            Engineering blogs, open source projects, and developer communities in one focused stream.
          </p>

          <button
            type="button"
            onClick={onOpenFinder}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-100"
          >
            Open Finder
            <Icon name="arrow" className="size-4" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <MetricCard value="04" label="Sources" />
        <MetricCard value="06" label="Topics" />
        <MetricCard value="Live" label="Status" accent />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
              Explore by topic
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">Your lanes</h3>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {topics.map((topic, index) => (
            <button
              key={topic}
              type="button"
              onClick={onOpenFinder}
              className={`shrink-0 rounded-2xl border px-4 py-3 text-sm transition ${
                index === 0
                  ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100"
                  : "border-white/10 bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
              Connected now
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em]">Live sources</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
            Convex
          </span>
        </div>
        <SourcesList />
      </section>
    </div>
  );
}

function FinderView() {
  return (
    <div className="space-y-7 py-4 sm:py-8">
      <section>
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/45">
            Discover the source
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Find the signal behind the story.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-white/40">
            Search trusted sources directly. No generated summaries, no ranking tricks, no filler.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <SourceFinder />
      </section>
    </div>
  );
}

function SettingsView() {
  const [liveAlerts, setLiveAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compactCards, setCompactCards] = useState(false);

  return (
    <div className="space-y-7 py-4 sm:py-8">
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/45">
          Tune Findit
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Make the feed yours.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/40">
          Keep the interface quiet, fast, and focused on the sources you care about.
        </p>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/30">Feed</p>
        </div>
        <SettingToggle
          icon="bell"
          title="Live alerts"
          description="Surface important source activity as it happens."
          enabled={liveAlerts}
          onChange={setLiveAlerts}
        />
        <SettingToggle
          icon="refresh"
          title="Auto refresh"
          description="Keep source data current while Findit is open."
          enabled={autoRefresh}
          onChange={setAutoRefresh}
        />
        <SettingToggle
          icon="layout"
          title="Compact cards"
          description="Show more items on screen with tighter spacing."
          enabled={compactCards}
          onChange={setCompactCards}
          last
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/30">System</p>
        </div>
        <SettingsRow icon="spark" title="Data engine" value="Convex · Live" />
        <SettingsRow icon="info" title="Findit version" value="0.1 · Preview" last />
      </section>

      <div className="rounded-[2rem] border border-cyan-300/10 bg-cyan-300/[0.035] p-5">
        <p className="text-sm font-medium text-cyan-100/80">Built for focus.</p>
        <p className="mt-1.5 text-sm leading-6 text-white/35">
          Settings are currently stored in this browser. Account sync can come later when authentication is added.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 sm:rounded-3xl sm:p-5 ${
        accent
          ? "border-emerald-300/15 bg-emerald-300/[0.055]"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <p className={`text-lg font-semibold tracking-[-0.04em] sm:text-2xl ${accent ? "text-emerald-200" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/30 sm:text-xs">{label}</p>
    </div>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  onChange,
  last = false,
}: {
  icon: IconName;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${last ? "" : "border-b border-white/[0.06]"}`}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/50">
        <Icon name={icon} className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-white/30">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          enabled
            ? "border-cyan-200/30 bg-cyan-300"
            : "border-white/10 bg-white/[0.07]"
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full transition ${
            enabled ? "left-6 bg-zinc-950" : "left-1 bg-white/55"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  value,
  last = false,
}: {
  icon: IconName;
  title: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${last ? "" : "border-b border-white/[0.06]"}`}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/50">
        <Icon name={icon} className="size-[18px]" />
      </div>
      <p className="flex-1 text-sm font-medium text-white/80">{title}</p>
      <p className="text-xs text-white/35">{value}</p>
    </div>
  );
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
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-white/10 bg-[#111315]/90 p-1.5 shadow-[0_-18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="grid grid-cols-3 gap-1">
          {items.map((item) => {
            const active = item.view === activeView;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onChange(item.view)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] px-3 py-2 transition duration-300 ${
                  active
                    ? "bg-white/[0.09] text-white"
                    : "text-white/35 hover:bg-white/[0.04] hover:text-white/60"
                }`}
              >
                {active && (
                  <span className="absolute top-1.5 size-1 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                )}
                <Icon name={item.icon} className="mt-1 size-5" />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.5v10h13v-10" />
        <path d="M9.5 19.5v-6h5v6" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.6h-.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.06 3.2l.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v-.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8c.12.38.33.72.6 1 .3.28.68.42 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1.6Z" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="m12 3 1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 11" />
        <path d="M17.9 15A7 7 0 0 1 6.4 17.6L4 13" />
      </svg>
    );
  }

  if (name === "layout") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d="M9 10h12" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
