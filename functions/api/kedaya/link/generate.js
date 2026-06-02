import { createKedayaLink, errorResponse, json, readJsonOrForm, text } from "../../../_shared/cards.js";

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    return generateLink(request, url.searchParams.get("email") || url.searchParams.get("p") || "", url.searchParams.get("minutes"));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request }) {
  try {
    const payload = await readJsonOrForm(request);
    return generateLink(request, payload.email || payload.p || "", payload.minutes);
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "GET, POST" });
}

async function generateLink(request, email, minutesValue) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return json({ ok: false, detail: "Missing email" }, 400);
  }

  const minutes = Math.max(1, Math.min(60, Number(minutesValue) || 7));
  const result = await createKedayaLink(request, normalizedEmail, minutes * 60 * 1000);
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");
  return wantsJson ? json({ ok: true, email: normalizedEmail, ...result }) : text(`${result.link}\n`);
}
