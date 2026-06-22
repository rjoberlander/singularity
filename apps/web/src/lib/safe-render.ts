/**
 * Helpers for safely rendering JSONB fields that may have unexpected types.
 *
 * JSONB columns can store strings, arrays, objects, or nulls for the same field
 * across different rows. These helpers prevent React crashes (error #31: objects
 * as children, TypeError: .map is not a function) by normalizing at render time.
 */

/** Render a value that should be a string but might be an object or array. */
export function safeString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(safeString).join("; ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${safeString(v)}`)
      .join("; ");
  }
  return String(value);
}

/** Safely iterate a value that should be an array but might be a string or object. */
export function safeArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}
