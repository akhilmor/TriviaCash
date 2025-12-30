// Global fetch guard to prevent ANY duplicate API calls across the entire app
// This is a module-level singleton that can be imported and used by any hook

interface FetchLock {
  category?: string;
  mode: string;
  timestamp: number;
}

let globalFetchInProgress = false;
let globalFetchLock: FetchLock | null = null;

export function isFetchInProgress(): boolean {
  return globalFetchInProgress;
}

export function getFetchLock(): FetchLock | null {
  return globalFetchLock;
}

export function setFetchLock(category: string | undefined, mode: 'single' | 'multi'): void {
  globalFetchInProgress = true;
  globalFetchLock = {
    category: category || 'any',
    mode,
    timestamp: Date.now(),
  };
}

export function releaseFetchLock(): void {
  // Release after a small delay to prevent race conditions
  setTimeout(() => {
    globalFetchInProgress = false;
    globalFetchLock = null;
  }, 100);
}

export function releaseFetchLockImmediate(): void {
  globalFetchInProgress = false;
  globalFetchLock = null;
}

// Check if we should block a fetch based on category and mode
// Blocks ANY concurrent fetch to prevent 429 rate limit errors
export function shouldBlockFetch(category: string | undefined, mode: 'single' | 'multi'): boolean {
  if (!globalFetchInProgress) return false;
  
  const lock = globalFetchLock;
  if (!lock) return false;
  
  // Block ANY concurrent fetch to prevent rate limits
  // Only allow if it's the SAME fetch (same mode and same category)
  const categoryKey = category || 'any';
  const isSameFetch = lock.mode === mode && lock.category === categoryKey;
  
  // If it's a different fetch, block it to prevent 429 errors
  return !isSameFetch;
}

