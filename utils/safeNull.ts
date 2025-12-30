export function safeNull<T>(value: T | undefined | null, fallback?: T): T {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    return null as any;
  }
  return value;
}

