import { createCardLink, errorResponse, formatCode, json, normalizeCode, randomToken, readJsonOrForm, requireAdmin, requireDb, text } from "../../_shared/cards.js";

export async function onRequestPost({ request, env }) {
  try {
    requireAdmin(request, env);
    const db = requireDb(env);
    const payload = await readJsonOrForm(request);
    const codes = normalizeInputCodes(payload.codes || payload.code || "");

    if (!codes.length) {
      return json({ ok: false, detail: "Missing codes" }, 400);
    }

    const now = Date.now();
    const items = [];
    for (const code of codes) {
      const token = randomToken();
      await db.prepare(
        "INSERT INTO cards (token, code, status, created_at, issued_at, access_count) VALUES (?, ?, 'issued', ?, ?, 0)",
      ).bind(token, formatCode(code), now, now).run();
      items.push({ code: formatCode(code), token, cardLink: createCardLink(request, token), status: "issued" });
    }

    if (wantsText(request)) {
      return text(`${items.map((item) => item.cardLink).join("\n")}\n`);
    }

    return json({ ok: true, count: items.length, items });
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "POST" });
}

function wantsText(request) {
  const url = new URL(request.url);
  return url.searchParams.get("format") === "text" || request.headers.get("accept")?.includes("text/plain");
}

function normalizeInputCodes(value) {
  const list = Array.isArray(value) ? value : String(value).split(/[\n,\s]+/);
  const seen = new Set();
  const codes = [];
  for (const item of list) {
    const normalized = normalizeCode(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      codes.push(normalized);
    }
  }
  return codes;
}
