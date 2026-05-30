export function onRequestGet() {
  const now = Date.now();
  return new Response(JSON.stringify({
    ok: true,
    now,
    timezone: "Asia/Shanghai",
    beijing_time: new Date(now + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").replace(".000Z", ""),
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function onRequest() {
  return new Response(JSON.stringify({ detail: "Method Not Allowed" }), {
    status: 405,
    headers: {
      Allow: "GET",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
