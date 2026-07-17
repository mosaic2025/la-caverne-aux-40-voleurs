// ============================================================
// L4 — Cache mémoire LRU
// ============================================================

class LRU extends Map {
  constructor(capacity = 128) {
    super();
    this.capacity = capacity;
  }
  get(key) {
    if (!super.has(key)) return undefined;
    const v = super.get(key);
    super.delete(key);
    super.set(key, v);
    return v;
  }
  set(key, value) {
    if (super.has(key)) super.delete(key);
    else if (super.size >= this.capacity) {
      const first = super.keys().next().value;
      super.delete(first);
    }
    super.set(key, value);
    return this;
  }
}

const store = new LRU(128);
const ttl = 5 * 60 * 1000; // 5 minutes

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, customTtlMs = ttl) {
  store.set(key, { value, expires: Date.now() + customTtlMs });
}

export function cacheStats() {
  return { size: store.size, capacity: store.capacity };
}
