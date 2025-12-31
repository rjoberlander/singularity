import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Web-specific utility for Tailwind class merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export all utils from shared package
export * from "@singularity/shared-utils";
