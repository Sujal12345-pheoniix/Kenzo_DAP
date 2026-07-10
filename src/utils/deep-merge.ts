/**
 * Deep merge utility for configuration objects.
 * @module utils/deep-merge
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T>>
): T {
  const result = { ...target };

  for (const source of sources) {
    if (!isPlainObject(source)) continue;

    for (const key of Object.keys(source) as Array<keyof T>) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[keyof T];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[keyof T];
      }
    }
  }

  return result;
}
