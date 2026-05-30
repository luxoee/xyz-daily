export async function getBeijingNow() {
  const response = await fetch("/api/time", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.ok && Number.isFinite(payload.now)) {
    return Number(payload.now);
  }

  throw new Error("无法获取真实北京时间，请稍后再试。");
}
