/**
 * Debounce utility — delays invocation until pause in calls.
 * @module utils/debounce
 */

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, delayMs);
  };
}
