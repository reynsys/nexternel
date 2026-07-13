import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** e.g. `damnhome/living-room` → `living-room` */
export function deviceSlugFromTopicPrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/\/+$/, "");
  const last = trimmed.split("/").filter(Boolean).pop();
  return last ? slugify(last) : "";
}
