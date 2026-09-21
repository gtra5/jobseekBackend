/**
 * Minimal in-memory TTL cache.
 * No external dependencies — used to avoid hammering third-party job
 * sourcing APIs on every request. Entries are evicted lazily on read and
 * eagerly (oldest-first) once the entry cap is reached.
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 100;

// Map preserves insertion order, so the first key is the oldest entry.
const store = new Map();

const now = () => Date.now();

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (now() - entry.createdAt > entry.ttl) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

const set = (key, value, ttl = DEFAULT_TTL) => {
  // Deleting before re-inserting refreshes the entry to the "newest" slot.
  if (store.has(key)) store.delete(key);
  store.set(key, { value, createdAt: now(), ttl });

  // Evict oldest entries if we exceed the cap.
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
};

const clear = () => store.clear();

const stats = () => ({ size: store.size, max: MAX_ENTRIES, ttl: DEFAULT_TTL });

module.exports = { get, set, clear, stats };