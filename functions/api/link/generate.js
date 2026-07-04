const PASSWORD = "nfs";
const DEFAULT_DURATION = "7分钟";
const DEFAULT_DURATION_MS = 7 * 60 * 1000;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  return generateResponse(request, url.searchParams.get("code") || "");
}

export async function onRequestPost({ request }) {
  const contentType = request.headers.get("content-type") || "";
  let code = "";

  if (contentType.includes("application/json")) {
    const payload = await request.json().catch(() => ({}));
    code = String(payload.code || "");
  } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    code = String(form.get("code") || "");
  } else {
    return json({ ok: false, detail: "Unsupported content type" }, 415);
  }

  return generateResponse(request, code);
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "GET, POST" });
}

async function generateResponse(request, code) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return json({ ok: false, detail: "Missing code" }, 400);
  }

  const createdAt = Date.now();
  const expiresAt = createdAt + DEFAULT_DURATION_MS;
  const encrypted = await encryptPayload({
    code: formatCode(normalized),
    duration: DEFAULT_DURATION,
    expiresAt,
    createdAt,
  });
  const link = new URL("/keria/", new URL(request.url).origin);
  link.searchParams.set("p", encrypted);

  if ((request.headers.get("accept") || "").includes("application/json")) {
    return json({ ok: true, link: link.toString(), expiresAt, duration: DEFAULT_DURATION }, 200);
  }

  return new Response(`${link.toString()}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizeCode(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatCode(value) {
  const code = normalizeCode(value);
  return code.length === 12 ? `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}` : code;
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

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
