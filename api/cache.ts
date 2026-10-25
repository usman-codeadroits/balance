/**
 * Small response cache for read-only API calls.
 *
 * - Serves a fresh-enough copy from memory (and optionally AsyncStorage) instead of calling the server
 * - Concurrent callers for the same key share one in-flight request
 * - If the network fails, falls back to the last good copy (even if expired)
 * - invalidateCache(prefix) drops entries after a mutation so the next read is fresh
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

type Entry<T> = { data: T; at: number };

const STORAGE_PREFIX = "apiCache:";

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
// Bumped on every invalidation so a request that started before it doesn't repopulate stale data
let generation = 0;

export const CACHE_TTL = {
  // Short because revalidating is cheap: an unchanged menu comes back as an empty 304 (ETag)
  MEALS: 10 * 60 * 1000,
  MEAL_CATEGORIES: 6 * 60 * 60 * 1000,
  MY_SUBSCRIPTIONS: 60 * 1000,
  SUBSCRIPTION_DETAILS: 60 * 1000,
  SUBSCRIPTION_HISTORY: 10 * 60 * 1000,
};

type CachedOptions<T> = {
  ttlMs: number;
  /** Also keep the copy in AsyncStorage so it survives app restarts (use only for non-user data) */
  persist?: boolean;
  /** Skip the cache and always hit the server (e.g. pull-to-refresh) */
  force?: boolean;
  /** Return false to avoid caching a response (e.g. success: false or an empty list) */
  shouldCache?: (data: T) => boolean;
};

const readStorage = async <T>(key: string): Promise<Entry<T> | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
};

export const cached = async <T>(
  key: string,
  // Receives the previous (expired) copy, if any — e.g. to revalidate it with an ETag
  fetcher: (previous?: T) => Promise<T>,
  { ttlMs, persist = false, force = false, shouldCache = () => true }: CachedOptions<T>,
): Promise<T> => {
  let entry = memory.get(key) as Entry<T> | undefined;
  if (!entry && persist) {
    const stored = await readStorage<T>(key);
    if (stored) {
      entry = stored;
      memory.set(key, stored);
    }
  }

  if (!force && entry && Date.now() - entry.at < ttlMs) return entry.data;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const startedGeneration = generation;
  const request = (async () => {
    try {
      const data = await fetcher(entry?.data);
      if (shouldCache(data) && startedGeneration === generation) {
        const fresh: Entry<T> = { data, at: Date.now() };
        memory.set(key, fresh);
        if (persist) AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(fresh)).catch(() => {});
      }
      return data;
    } catch (error) {
      // Network/server failure — better to show the last good copy than an error
      if (entry) return entry.data;
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
};

/** Drop every cached entry whose key starts with `prefix` */
export const invalidateCache = (prefix: string) => {
  generation += 1;
  for (const key of Array.from(memory.keys())) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  AsyncStorage.getAllKeys()
    .then((keys) => keys.filter((k) => k.startsWith(STORAGE_PREFIX + prefix)))
    .then((keys) => (keys.length ? AsyncStorage.multiRemove(keys) : undefined))
    .catch(() => {});
};

/** Subscription data changed (payment, meal/day update, pause/resume) — refetch on next read */
export const invalidateSubscriptionCache = () => invalidateCache("subs:");

/** Clear everything (logout / account switch) */
export const clearApiCache = () => invalidateCache("");
