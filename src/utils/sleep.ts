/**
 * Sleep utility for async retry loops.
 * @module utils/sleep
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
