import { errorResponse, json, readJsonOrForm, readKedayaEmailToken } from "../../_shared/cards.js";

const KEDAYA_ORIGIN = "https://codex.kedaya.xyz";

export async function handleKedayaManualMail({ request }) {
  try {
    if (request.method !== "POST") {
      return json({ detail: "Method Not Allowed" }, 405, { Allow: "POST" });
    }

    const payload = await readJsonOrForm(request);
    const token = String(payload.p || "");
    if (!token) {
      return json({ ok: false, detail: "Missing access token" }, 400);
    }

    const access = await readKedayaEmailToken(token);
    const upstream = await fetch(`${KEDAYA_ORIGIN}/api/manual_mail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: request.headers.get("accept") || "application/json",
      },
      body: JSON.stringify({ email: access.email }),
      redirect: "manual",
    });

    const headers = new Headers(upstream.headers);
    headers.delete("set-cookie");
    headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
