const TARGET = "https://plus.keria.cc.cd/api/pickup/mail-code";

export async function onRequestPost({ request }) {
  return proxyFormRequest(request, TARGET);
}

export function onRequest() {
  return methodNotAllowed();
}

async function proxyFormRequest(request, target) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
    return json({ detail: "Unsupported content type" }, 415);
  }

  try {
    const body = await request.formData();
    const response = await fetch(target, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "User-Agent": "mail-code-helper-pages-proxy",
      },
      body,
    });

    return withSafeHeaders(response);
  } catch {
    return json({ detail: "Upstream request failed" }, 502);
  }
}

function methodNotAllowed() {
  return json({ detail: "Method Not Allowed" }, 405, { Allow: "POST" });
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function withSafeHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.delete("set-cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
