import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer paise to INR string using pure integer math.
 * Tested values: 0, 1, 99, 100, 123456789
 */
export function formatPaise(paise: bigint | string | number): string {
  const p =
    typeof paise === "bigint"
      ? paise
      : BigInt(Math.round(Number(paise)));
  const isNeg = p < 0n;
  const abs = isNeg ? -p : p;
  const rupees = abs / 100n;
  const cents = abs % 100n;
  const formatted = rupees.toLocaleString("en-IN");
  const result = `₹${formatted}.${String(cents).padStart(2, "0")}`;
  return isNeg ? `-${result}` : result;
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string | Date): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
