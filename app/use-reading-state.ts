"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";

const SAVED_KEY = "findit:saved-articles";
const READ_KEY = "findit:read-articles";

export function useReadingState() {
  const [savedIds, setSavedIds] = useState<Id<"articles">[]>([]);
  const [readIds, setReadIds] = useState<Id<"articles">[]>([]);

  useEffect(() => {
    setSavedIds(readStoredIds(SAVED_KEY));
    setReadIds(readStoredIds(READ_KEY));
  }, []);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const toggleSaved = useCallback((id: Id<"articles">) => {
    setSavedIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [id, ...current];
      writeStoredIds(SAVED_KEY, next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: Id<"articles">) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [id, ...current].slice(0, 500);
      writeStoredIds(READ_KEY, next);
      return next;
    });
  }, []);

  const markUnread = useCallback((id: Id<"articles">) => {
    setReadIds((current) => {
      const next = current.filter((item) => item !== id);
      writeStoredIds(READ_KEY, next);
      return next;
    });
  }, []);

  return {
    savedIds,
    savedSet,
    readSet,
    toggleSaved,
    markRead,
    markUnread,
  };
}

function readStoredIds(key: string): Id<"articles">[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is Id<"articles"> => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: Id<"articles">[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Local storage can be unavailable in private/restricted browser contexts.
  }
}
