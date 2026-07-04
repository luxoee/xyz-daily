import { errorResponse, json, readJsonOrForm } from "../../_shared/cards.js";

const DEFAULT_HOTMAIL_API_BASE = "https://mail.dgx.cc.cd";
const DEFAULT_HOTMAIL_API_KEY = "8cdcddd8bef6ef2900c6ba9fd448b521";

export async function onRequestPost({ request, env }) {
  try {
    const payload = await readJsonOrForm(request);
    const email = String(payload.email || payload.email_or_url || "").trim().toLowerCase();
    if (!email) {
      return json({ ok: false, detail: "Missing email" }, 400);
    }

    const apiKey = String(env.HOTMAIL_API_KEY || DEFAULT_HOTMAIL_API_KEY).trim();
    if (!apiKey) {
      return json({ ok: false, detail: "HOTMAIL_API_KEY is not configured" }, 500);
    }

    const upstreamUrl = new URL("/api/external/emails", normalizeBase(env.HOTMAIL_API_BASE || DEFAULT_HOTMAIL_API_BASE));
    upstreamUrl.searchParams.set("email", email);
    upstreamUrl.searchParams.set("folder", "all");
    upstreamUrl.searchParams.set("top", "5");
    upstreamUrl.searchParams.set("api_key", apiKey);

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "xyz-daily-hotmail-proxy",
      },
      redirect: "manual",
    });
    const text = await upstream.text();
    const data = parsePayload(text);

    if (!upstream.ok) {
      return json({ ok: false, detail: errorFromPayload(data) || `Hotmail upstream failed: ${upstream.status}` }, upstream.status >= 500 ? 502 : upstream.status);
    }
    if (data && typeof data === "object" && data.success === false) {
      return json({ ok: false, detail: errorFromPayload(data) || "Hotmail upstream returned an error" }, 502);
    }

    const messages = normalizeMessages(data);
    const code = findCode(messages);
    return json({
      ok: true,
      code,
      messages,
      requested_email: data?.requested_email || email,
      resolved_email: data?.resolved_email || "",
      resolved_query_email: data?.resolved_query_email || "",
      matched_alias: data?.matched_alias || "",
      partial: Boolean(data?.partial),
      detail: code ? "已获取验证码" : "最新邮件中没有识别到验证码",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "POST" });
}

function normalizeBase(value) {
  const base = String(value || DEFAULT_HOTMAIL_API_BASE).trim().replace(/\/+$/, "");
  return `${base}/`;
}

function parsePayload(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text.trim() };
  }
}

function normalizeMessages(data) {
  const messages = Array.isArray(data?.emails) ? data.emails : Array.isArray(data?.messages) ? data.messages : [];
  return messages.map((message) => {
    const fields = [message.code, message.subject, message.body_preview, message.preview, message.bodyPreview, message.body, message.text, message.content]
      .filter(Boolean)
      .map(stringValue)
      .join("\n");
    return {
      id: stringValue(message.id),
      subject: stringValue(message.subject),
      from: stringValue(message.from),
      date: stringValue(message.date || message.time || message.receivedAt),
      folder: stringValue(message.folder),
      body_preview: stringValue(message.body_preview || message.preview || message.bodyPreview),
      body: stringValue(message.body || message.text || message.content),
      code: findCodeInText(fields),
    };
  });
}

function findCode(messages) {
  for (const message of messages) {
    if (message.code) {
      return message.code;
    }
  }
  return "";
}

function findCodeInText(value) {
  const text = String(value || "");
  const match = text.match(/\b\d{4,8}\b/);
  return match?.[0] || "";
}

function stringValue(value) {
  if (value == null) {
    return "";
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function errorFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const error = payload.error;
  if (error && typeof error === "object") {
    return String(error.message || error.detail || "");
  }
  return String(error || payload.detail || payload.message || "");
}
