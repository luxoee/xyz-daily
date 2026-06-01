import { errorResponse, json, parseTokenFromLink, readJsonOrForm, requireAdmin, requireDb, text } from "../../_shared/cards.js";

export async function onRequestGet({ request, env }) {
  try {
    requireAdmin(request, env);
    const url = new URL(request.url);
    return resolveCard(request, env, url.searchParams.get("link") || url.searchParams.get("token") || "");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    requireAdmin(request, env);
    const payload = await readJsonOrForm(request);
    return resolveCard(request, env, payload.link || payload.token || "");
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "GET, POST" });
}

async function resolveCard(request, env, value) {
  const token = parseTokenFromLink(value);
  if (!token) {
    return json({ ok: false, detail: "Missing link or token" }, 400);
  }

  const db = requireDb(env);
  const row = await db.prepare(
    "SELECT token, code, status, created_at, issued_at, claimed_at, last_access_at, access_count FROM cards WHERE token = ?",
  ).bind(token).first();

  if (!row) {
    return json({ ok: false, detail: "Card not found" }, 404);
  }

  if (wantsText(request)) {
    return text(`${row.code}\n`);
  }

  return json({ ok: true, card: row });
}

function wantsText(request) {
  const url = new URL(request.url);
  return url.searchParams.get("format") === "text" || request.headers.get("accept")?.includes("text/plain");
}
