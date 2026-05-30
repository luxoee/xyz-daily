import type { CachedMailCredential } from "./types";

const prefix = "mail-code-helper:v2:";

export function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatCode(value: string) {
  const code = normalizeCode(value);
  return code.length === 12 ? `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}` : code;
}

export async function cacheKeyForCode(code: string) {
  const normalized = normalizeCode(code);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}${hash}`;
}

export function readCachedCredential(key: string, now = Date.now()) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const credential = JSON.parse(raw) as CachedMailCredential;
    if (!credential.expiresAt || credential.expiresAt <= now) {
      localStorage.removeItem(key);
      return null;
    }
    return credential;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeCachedCredential(key: string, credential: CachedMailCredential) {
  localStorage.setItem(key, JSON.stringify(credential));
}

export function clearCachedCredential(key: string) {
  localStorage.removeItem(key);
}

export function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
