import clsx, { type ClassValue } from "clsx";

/** Tiny className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Deterministic colour from a name, for avatar fallbacks. */
const PALETTE = [
  "#2D8CFF", "#F6A609", "#16A34A", "#9333EA",
  "#EA580C", "#0891B2", "#DB2777", "#4F46E5",
];
export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
