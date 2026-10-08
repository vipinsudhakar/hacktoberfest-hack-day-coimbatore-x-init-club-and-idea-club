/**
 * Runs `worker` over `items` with at most `limit` calls in flight.
 * Stops picking up new items once `signal` is aborted. The worker handles its own errors.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  async function lane() {
    while (next < items.length && !signal?.aborted) {
      const index = next++;
      await worker(items[index], index);
    }
  }
  const lanes = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: lanes }, lane));
}

/**
 * A shared cap on calls in flight, so work that joins after a pool has started (a manual retry, or a
 * set-aside trial the user asks to check anyway) still never exceeds it.
 * A finishing call hands its slot straight to the next waiter.
 */
export function createLimiter(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active < limit) active++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
