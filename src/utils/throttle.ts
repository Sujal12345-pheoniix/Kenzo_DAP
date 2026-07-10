/**
 * Throttle utility — limits invocation rate.
 * @module utils/throttle
 */

export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = intervalMs - (now - lastCall);
    pendingArgs = args;

    if (remaining <= 0) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastCall = now;
      fn(...args);
      pendingArgs = null;
    } else if (timerId === null) {
      timerId = setTimeout(() => {
        lastCall = Date.now();
        timerId = null;
        if (pendingArgs) {
          fn(...pendingArgs);
          pendingArgs = null;
        }
      }, remaining);
    }
  };
}
