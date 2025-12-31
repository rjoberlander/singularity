import { twMerge } from "tailwind-merge";

// Mobile-specific utility for Tailwind class merging (NativeWind)
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(inputs.filter(Boolean).join(" "));
}

// Re-export all utils from shared package
export * from "@singularity/shared-utils";
