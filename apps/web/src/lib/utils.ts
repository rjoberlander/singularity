import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function getBiomarkerStatus(
  value: number,
  refLow?: number,
  refHigh?: number,
  optLow?: number,
  optHigh?: number
): "low" | "normal" | "high" | "optimal" {
  if (refLow !== undefined && value < refLow) return "low";
  if (refHigh !== undefined && value > refHigh) return "high";
  if (optLow !== undefined && optHigh !== undefined) {
    if (value >= optLow && value <= optHigh) return "optimal";
  }
  return "normal";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    low: "text-red-500",
    high: "text-yellow-500",
    normal: "text-green-500",
    optimal: "text-emerald-400",
    active: "text-green-500",
    achieved: "text-emerald-400",
    paused: "text-gray-500",
  };
  return colors[status] || "text-gray-500";
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    low: "bg-red-500/10",
    high: "bg-yellow-500/10",
    normal: "bg-green-500/10",
    optimal: "bg-emerald-400/10",
    active: "bg-green-500/10",
    achieved: "bg-emerald-400/10",
    paused: "bg-gray-500/10",
  };
  return colors[status] || "bg-gray-500/10";
}
