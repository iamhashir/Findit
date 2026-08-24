"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { anyApi, type FunctionReference } from "convex/server";
import {
  ChevronDown,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { SourceAvatar } from "./source-avatar";

type SourceKind = "rss" | "api" | "web";
type SourceQuality = "primary" | "expert" | "publication" | "community";
type HealthStatus = "healthy" | "degraded" | "failing" | "unknown" | "disabled";

type Source = {
  _id: Id<"sources">;
  name: string;
  siteUrl: string;
  feedUrl?: string;
  apiUrl?: string;
  kind: SourceKind;
  category: string;
  enabled: boolean;
  recommended?: boolean;
  description?: string;
  tags?: string[];
  quality?: SourceQuality;
  priority?: number;
};

type SourceHealth = {
  sourceId: Id<"sources">;
  status: HealthStatus;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastError?: string;
  consecutiveFailures: number;
  totalRuns: number;
  successRate: number;
  averageDiscovered: number;
  averageCreated: number;
  updateRate: number;
  lastDiscovered: number;
  lastCreated: number;
  lastUpdated: number;
  lastSkipped: number;
  lastDurationMs: number;
  lastNeedsBrowser: boolean;
  articleSampleSize: number;
  latestArticleAt?: number;
  missingDescriptionRate: number;
  missingAuthorRate: number;
  missingImageRate: number;
};

type Draft = {
  name: string;
  siteUrl: string;
  feedUrl: string;
  apiUrl: string;
  kind: SourceKind;
  category: string;
};

type ScrapeResult = {
  sourceId: Id<"sources">;
  sourceName: string;
  discovered: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  needsBrowser: boolean;
};

const scraperApi = {
  scrapeSource: (anyApi as any).ingestion.syncSource as FunctionReference<
    "action",
    "public",
    { sourceId: Id<"sources">; maxArticles?: number },
    ScrapeResult
  >,
  scrapeAll: (anyApi as any).ingestion.syncAll as FunctionReference<
    "action",
    "public",
    { maxSources?: number; maxArticlesPerSource?: number; dueOnly?: boolean },
    ScrapeResult[]
  >,
};

const emptyDraft: Draft = {
  name: "",
  siteUrl: "",
  feedUrl: "",
  apiUrl: "",
  kind: "rss",
  category: "",
};

export function SourceManager() {
  const dashboard = useQuery(api.sources.sourceDashboard, {}) as
    | { sources: Source[]; health: SourceHealth[] }
    | undefined;
  const sources = dashboard?.sources;
  const healthRows = dashboard?.health;
  const createSource = useMutation(api.sources.create);
  const updateSource = useMutation(api.sources.update);
  const setEnabled = useMutation(api.sources.setEnabled);
  const scrapeSource = useAction(scraperApi.scrapeSource);
  const scrapeAll = useAction(scraperApi.scrapeAll);

  const [editingId, setEditingId] = useState<Id<"sources"> | "new" | null>(null);
  const [expandedHealthId, setExpandedHealthId] = useState<Id<"sources"> | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<Id<"sources"> | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");

  const healthBySource = useMemo(
    () => new Map((healthRows ?? []).map((item) => [item.sourceId, item])),
    [healthRows],
  );

  const healthCounts = useMemo(() => {
    const rows = healthRows ?? [];
    return {
      healthy: rows.filter((item) => item.status === "healthy").length,
      attention: rows.filter((item) => item.status === "degraded" || item.status === "failing").length,
      failing: rows.filter((item) => item.status === "failing").length,
      unchecked: rows.filter((item) => item.status === "unknown").length,
    };
  }, [healthRows]);

  const categories = useMemo(() => {
    if (!sources) return [];
    return Array.from(new Set(sources.map((source) => source.category))).sort();
  }, [sources]);

  const visibleSources = useMemo(() => {
    if (!sources) return [];
    const needle = sourceQuery.trim().toLowerCase();
    return sources.filter((source) => {
      const health = healthBySource.get(source._id);
      if (categoryFilter !== "All" && source.category !== categoryFilter) return false;
      if (healthFilter !== "All" && health?.status !== healthFilter) return false;
      if (!needle) return true;
      const haystack = [source.name, source.category, ...(source.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [categoryFilter, healthBySource, healthFilter, sourceQuery, sources]);

  function startAdd() {
    setError("");
    setDraft(emptyDraft);
    setEditingId("new");
  }

  function startEdit(source: Source) {
    setError("");
    setDraft({
      name: source.name,
      siteUrl: source.siteUrl,
      feedUrl: source.feedUrl ?? "",
      apiUrl: source.apiUrl ?? "",
      kind: source.kind,
      category: source.category,
    });
    setEditingId(source._id);
  }

  async function save() {
    if (!draft.name.trim() || !draft.siteUrl.trim() || !draft.category.trim()) {
      setError("Name, category and website are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: draft.name,
        siteUrl: draft.siteUrl,
        feedUrl: draft.feedUrl,
        apiUrl: draft.apiUrl,
        kind: draft.kind,
        category: draft.category,
      };
      if (editingId === "new") await createSource(payload);
      else if (editingId) await updateSource({ id: editingId, ...payload });
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save source.");
    } finally {
      setSaving(false);
    }
  }

  async function syncOne(source: Source) {
    setSyncingId(source._id);
    setStatus("");
    setError("");
    try {
      const result = await scrapeSource({ sourceId: source._id, maxArticles: 6 });
      setStatus(
        result.needsBrowser
          ? `${source.name}: browser needed`
          : `${source.name}: ${result.created} new · ${result.updated} changed · ${result.unchanged} unchanged`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  async function syncEnabled() {
    setSyncingAll(true);
    setStatus("");
    setError("");
    try {
      const results = await scrapeAll({
        maxSources: 20,
        maxArticlesPerSource: 4,
        dueOnly: true,
      });
      const created = results.reduce((sum, item) => sum + item.created, 0);
      const updated = results.reduce((sum, item) => sum + item.updated, 0);
      const unchanged = results.reduce((sum, item) => sum + item.unchanged, 0);
      const browser = results.filter((item) => item.needsBrowser).length;
      setStatus(
        `${results.length} due sources · ${created} new · ${updated} changed · ${unchanged} unchanged${
          browser ? ` · ${browser} need browser` : ""
        }`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 pb-4">
        <div>
          <p className="text-sm font-semibold text-white/80">{sources ? `${sources.length} sources` : "Sources"}</p>
          <p className="mt-0.5 text-xs text-white/30">{sources ? `${visibleSources.length} shown` : "Loading…"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void syncEnabled()}
            disabled={syncingAll}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-white/50 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-35"
          >
            <RefreshCw className={`size-3.5 ${syncingAll ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync due</span>
          </button>
          <button
            type="button"
            onClick={startAdd}
            className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            <Plus className="size-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-white/[0.075] bg-white/[0.06]">
        <HealthStat label="Healthy" value={healthRows ? healthCounts.healthy : null} />
        <HealthStat label="Attention" value={healthRows ? healthCounts.attention : null} />
        <HealthStat label="Failing" value={healthRows ? healthCounts.failing : null} />
        <HealthStat label="Unchecked" value={healthRows ? healthCounts.unchecked : null} />
      </div>

      {(status || error) ? (
        <div className={`mt-3 rounded-lg border px-3 py-2.5 text-xs ${error ? "border-red-400/15 bg-red-400/[0.04] text-red-200/70" : "border-white/[0.07] bg-white/[0.025] text-white/43"}`}>
          {error || status}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {editingId ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.022] p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-white/72">{editingId === "new" ? "Add source" : "Edit source"}</p>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  aria-label="Close source editor"
                  className="flex size-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.055] hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
                <Field label="Website" value={draft.siteUrl} onChange={(siteUrl) => setDraft({ ...draft, siteUrl })} wide />
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/28">Type</span>
                  <select
                    value={draft.kind}
                    onChange={(event) => setDraft({ ...draft, kind: event.target.value as SourceKind })}
                    className="h-10 rounded-lg border border-white/[0.09] bg-[#151515] px-3 text-sm text-white/72 outline-none focus:border-white/25"
                  >
                    <option value="rss">RSS</option>
                    <option value="api">API</option>
                    <option value="web">Web</option>
                  </select>
                </label>
                {draft.kind === "rss" ? <Field label="RSS URL" value={draft.feedUrl} onChange={(feedUrl) => setDraft({ ...draft, feedUrl })} /> : null}
                {draft.kind === "api" ? <Field label="API URL" value={draft.apiUrl} onChange={(apiUrl) => setDraft({ ...draft, apiUrl })} /> : null}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-white/45 transition hover:bg-white/[0.05] hover:text-white/70"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/28" />
          <input
            value={sourceQuery}
            onChange={(event) => setSourceQuery(event.target.value)}
            placeholder="Search sources"
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.025] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-white/20"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-lg border border-white/[0.08] bg-[#151515] px-3 text-xs text-white/55 outline-none"
        >
          <option value="All">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select
          value={healthFilter}
          onChange={(event) => setHealthFilter(event.target.value)}
          className="h-10 rounded-lg border border-white/[0.08] bg-[#151515] px-3 text-xs text-white/55 outline-none"
        >
          <option value="All">All health</option>
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="failing">Failing</option>
          <option value="unknown">Unchecked</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {sources === undefined
          ? [0, 1, 2, 3, 4].map((item) => <div key={item} className="h-[76px] animate-pulse bg-white/[0.012]" />)
          : visibleSources.map((source) => {
              const health = healthBySource.get(source._id);
              const expanded = expandedHealthId === source._id;
              const syncPending = syncingId === source._id;

              return (
                <div key={source._id}>
                  <div className="group flex items-center gap-3 py-3">
                    <SourceAvatar url={source.siteUrl} name={source.name} size="md" />

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-white/80">{source.name}</p>
                        <HealthDot status={health?.status ?? (source.enabled ? "unknown" : "disabled")} />
                        {source.priority === 1 ? <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-white/35">Core</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-white/28">
                        {source.category} · {source.kind.toUpperCase()}
                        {health?.lastAttemptAt ? ` · ${relativeTime(health.lastAttemptAt)}` : " · not checked"}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-label={`${source.enabled ? "Disable" : "Enable"} ${source.name}`}
                      aria-checked={source.enabled}
                      onClick={() => void setEnabled({ id: source._id, enabled: !source.enabled })}
                      className={`relative h-6 w-10 shrink-0 rounded-full transition ${source.enabled ? "bg-white" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-1 size-4 rounded-full transition-all ${source.enabled ? "left-5 bg-zinc-950" : "left-1 bg-white/45"}`} />
                    </button>

                    <div className="flex items-center gap-0.5 sm:opacity-55 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => void syncOne(source)}
                        disabled={syncPending || !source.enabled}
                        title="Sync source"
                        aria-label={`Sync ${source.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.055] hover:text-white disabled:opacity-25"
                      >
                        <RefreshCw className={`size-3.5 ${syncPending ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(source)}
                        title="Edit source"
                        aria-label={`Edit ${source.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.055] hover:text-white"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedHealthId(expanded ? null : source._id)}
                        title="Source audit"
                        aria-label={`${expanded ? "Hide" : "Show"} audit for ${source.name}`}
                        aria-expanded={expanded}
                        className="flex size-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.055] hover:text-white"
                      >
                        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
                          <ChevronDown className="size-3.5" />
                        </motion.span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expanded ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <HealthAudit health={health} source={source} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
        {sources !== undefined && visibleSources.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/32">No matching sources.</div>
        ) : null}
      </div>
    </section>
  );
}

function HealthAudit({ health, source }: { health?: SourceHealth; source: Source }) {
  if (!health || health.status === "unknown") {
    return (
      <div className="mb-3 rounded-lg bg-white/[0.025] px-4 py-3 text-xs text-white/35">
        Run a sync to establish health data.
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-white/[0.065] bg-white/[0.018] p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AuditMetric label="Health" value={healthLabel(health.status)} />
        <AuditMetric label="Success" value={percent(health.successRate)} />
        <AuditMetric label="Avg found" value={health.averageDiscovered.toFixed(1)} />
        <AuditMetric label="Avg new" value={health.averageCreated.toFixed(1)} />
        <AuditMetric label="Duration" value={durationLabel(health.lastDurationMs)} />
        <AuditMetric label="Update rate" value={percent(health.updateRate)} />
        <AuditMetric label="Skipped" value={String(health.lastSkipped)} />
        <AuditMetric label="Sample" value={String(health.articleSampleSize)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
        <QualityMetric label="Missing summary" value={health.missingDescriptionRate} />
        <QualityMetric label="Missing author" value={health.missingAuthorRate} />
        <QualityMetric label="Missing image" value={health.missingImageRate} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/26">
        <span>Success {health.lastSuccessAt ? relativeTime(health.lastSuccessAt) : "never"}</span>
        <span>Latest article {health.latestArticleAt ? relativeTime(health.latestArticleAt) : "none"}</span>
        <span>{source.kind.toUpperCase()}</span>
        {health.lastNeedsBrowser ? <span className="text-amber-200/55">Browser needed</span> : null}
      </div>

      {health.lastError && health.consecutiveFailures > 0 ? (
        <div className="mt-3 rounded-lg border border-red-300/10 bg-red-300/[0.03] px-3 py-2 text-xs leading-5 text-red-200/65">
          {health.lastError}
        </div>
      ) : null}
    </div>
  );
}

function HealthStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-[#121212] px-3 py-3 sm:px-4">
      <p className="truncate text-[9px] uppercase tracking-[0.1em] text-white/24">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white/70">{value ?? "—"}</p>
    </div>
  );
}

function HealthDot({ status }: { status: HealthStatus }) {
  const className =
    status === "healthy"
      ? "bg-emerald-400"
      : status === "failing"
        ? "bg-red-400"
        : status === "degraded"
          ? "bg-amber-400"
          : "bg-white/20";
  return <span title={healthLabel(status)} className={`size-1.5 shrink-0 rounded-full ${className}`} />;
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.1em] text-white/22">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/62">{value}</p>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.025] px-2.5 py-2">
      <p className="truncate text-[9px] text-white/24">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white/55">{percent(value)}</p>
    </div>
  );
}

function healthLabel(status: HealthStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  if (status === "failing") return "Failing";
  if (status === "disabled") return "Disabled";
  return "Unchecked";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function durationLabel(milliseconds: number) {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Field({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/28">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-white/[0.09] bg-[#151515] px-3 text-sm text-white/72 outline-none focus:border-white/25"
      />
    </label>
  );
}
