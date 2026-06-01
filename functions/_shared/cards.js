const PASSWORD = "nfs";
export const LINK_DURATION = "7分钟";
export const LINK_DURATION_MS = 7 * 60 * 1000;

export function requireDb(env) {
  const db = env.xyz_daily_cards || env.DB;
  if (!db) {
    throw new Response(JSON.stringify({ ok: false, detail: "D1 binding xyz_daily_cards is not configured" }), {
      status: 500,
      headers: jsonHeaders(),
    });
  }
  return db;
}

export function requireAdmin(request, env) {
  if (!env.CARD_ADMIN_TOKEN) {
    throw new Response(JSON.stringify({ ok: false, detail: "CARD_ADMIN_TOKEN is not configured" }), {
      status: 500,
      headers: jsonHeaders(),
    });
  }

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token !== env.CARD_ADMIN_TOKEN) {
    throw new Response(JSON.stringify({ ok: false, detail: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders(),
    });
  }
}

export function normalizeCode(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatCode(value) {
  const code = normalizeCode(value);
  return code.length === 12 ? `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}` : code;
}

export function parseTokenFromLink(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  try {
    const url = new URL(source);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "card" && parts[1]) {
      return parts[1];
    }
  } catch {}

  return source.replace(/^\/+|\/+$/g, "");
}

export function createCardLink(request, token) {
  return new URL(`/card/${encodeURIComponent(token)}`, new URL(request.url).origin).toString();
}

export async function createAccessLink(request, code) {
  const createdAt = Date.now();
  const expiresAt = createdAt + LINK_DURATION_MS;
  const encrypted = await encryptPayload({
    code: formatCode(code),
    duration: LINK_DURATION,
    expiresAt,
    createdAt,
  });
  const link = new URL("/", new URL(request.url).origin);
  link.searchParams.set("p", encrypted);
  return { link: link.toString(), expiresAt, duration: LINK_DURATION };
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return base64UrlEncode(bytes);
}

export async function readJsonOrForm(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders(),
      ...headers,
    },
  });
}

export function text(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function jsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export function errorResponse(error) {
  if (error instanceof Response) {
    return error;
  }
  return json({ ok: false, detail: "Internal Server Error" }, 500);
}

async function encryptPayload(payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey();
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const packed = new Uint8Array(iv.byteLength + encrypted.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(encrypted), iv.byteLength);
  return base64UrlEncode(packed);
}

async function deriveKey() {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PASSWORD));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt"]);
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
