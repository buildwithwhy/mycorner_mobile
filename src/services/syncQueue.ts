// Offline Sync Queue
// Tracks pending sync operations and provides a count for UI display.
// Uses a "dirty set" pattern — stores which labels/keys need syncing,
// not payloads. Sync hooks re-sync current state when flushing.

import { useState, useEffect, useCallback } from 'react';

// Module-level state (shared across all hook consumers)
const pendingItems = new Map<string, number>(); // "label" or "label:key" → timestamp
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

/** Mark a sync operation as pending (e.g., when offline or sync failed) */
export function markPending(label: string, key?: string): void {
  const id = key ? `${label}:${key}` : label;
  pendingItems.set(id, Date.now());
  notifyListeners();
}

/** Clear a pending sync after successful completion */
export function clearPending(label: string, key?: string): void {
  const id = key ? `${label}:${key}` : label;
  pendingItems.delete(id);
  notifyListeners();
}

/** Clear all pending syncs for a given label (e.g., after full flush) */
export function clearAllPending(label: string): void {
  for (const key of pendingItems.keys()) {
    if (key === label || key.startsWith(`${label}:`)) {
      pendingItems.delete(key);
    }
  }
  notifyListeners();
}

/** Get count of pending sync operations */
export function getPendingCount(): number {
  return pendingItems.size;
}

/** React hook to subscribe to pending sync count */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(() => pendingItems.size);

  useEffect(() => {
    const listener = () => setCount(pendingItems.size);
    listeners.add(listener);
    // Sync initial value
    listener();
    return () => { listeners.delete(listener); };
  }, []);

  return count;
}
