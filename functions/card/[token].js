import { createAccessLink, errorResponse, json, requireDb, text } from "../_shared/cards.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const token = String(params.token || "").trim();
    if (!token) {
      return text("卡密链接无效。\n", 400);
    }

    const db = requireDb(env);
    const now = Date.now();
    const update = await db.prepare(
      "UPDATE cards SET status = 'claimed', claimed_at = ?, last_access_at = ?, access_count = access_count + 1 WHERE token = ? AND status = 'issued'",
    ).bind(now, now, token).run();

    if (!update.meta || update.meta.changes !== 1) {
      const card = await db.prepare("SELECT status FROM cards WHERE token = ?").bind(token).first();
      if (!card) {
        return text("卡密链接不存在。\n", 404);
      }
      if (card.status === "claimed") {
        return text("该卡密已被领取，发货链接已失效。\n", 410);
      }
      return text("该卡密当前不可用。\n", 410);
    }

    const card = await db.prepare("SELECT code FROM cards WHERE token = ?").bind(token).first();
    if (!card?.code) {
      return text("卡密链接状态异常。\n", 500);
    }

    const access = await createAccessLink(request, card.code);
    return new Response(null, {
      status: 302,
      headers: {
        Location: access.link,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequest() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "GET" });
}
