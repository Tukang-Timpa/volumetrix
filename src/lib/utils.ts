import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate id berformat PREFIX-0001, incrementing dari daftar existing. */
export function nextId(prefix: string, existingIds: string[]): string {
  let max = 0;
  for (const id of existingIds) {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}
