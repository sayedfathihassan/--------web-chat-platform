import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FORBIDDEN_WORDS = [
  'كلب', 'حمار', 'غبي', 'شتيمة', // Add common Arabic offensive words
  'fuck', 'shit', 'bitch', 'asshole' // Common English offensive words
];

export function filterText(text: string): string {
  let filtered = text;
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
}
