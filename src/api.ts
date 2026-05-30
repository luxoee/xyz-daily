import type { MailCodeResponse, MailKeysResponse } from "./types";

const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${apiBase}${path}`;
}

async function postForm<T>(path: string, fields: Record<string, string>, retries = 0): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value);
      }

      const response = await fetch(apiUrl(path), {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        const message = payload.detail || payload.message || `请求失败：${response.status}`;
        throw new Error(response.status >= 500 ? `服务暂时不可用：${response.status}` : message);
      }

      return payload as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("请求失败");
      if (attempt === retries) {
        break;
      }
      await wait(500);
    }
  }

  throw lastError || new Error("请求失败");
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function exchangeMailKeys(codes: string) {
  return postForm<MailKeysResponse>("/api/pickup/mail-keys", { codes });
}

export function lookupMailCode(email: string, secret: string) {
  return postForm<MailCodeResponse>(
    "/api/pickup/mail-code",
    {
      email_or_url: email,
      mail_secret: secret,
    },
    1,
  );
}
