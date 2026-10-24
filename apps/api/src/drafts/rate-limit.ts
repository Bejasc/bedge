/** Fixed-window limiter keyed by client IP; enough to stop a runaway script filling Mongo with drafts. */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  public constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  public allow(key: string, now = Date.now()): boolean {
    const current = this.windows.get(key);
    if (!current || now - current.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      this.prune(now);
      return true;
    }
    current.count++;
    return current.count <= this.limit;
  }

  private prune(now: number): void {
    if (this.windows.size < 1000) return;
    for (const [key, w] of this.windows) if (now - w.start >= this.windowMs) this.windows.delete(key);
  }
}
