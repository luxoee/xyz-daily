import "./styles.css";

const params = new URLSearchParams(window.location.search);
const legacyToken = params.get("p");
if (legacyToken) {
  const url = new URL("/kedaya/", window.location.origin);
  url.searchParams.set("p", legacyToken);
  window.location.replace(url.toString());
}

const showDebug = params.get("debug") === "true";

const emailInput = getElement<HTMLInputElement>("emailInput");
const queryButton = getElement<HTMLButtonElement>("queryButton");
const copyCodeButton = getElement<HTMLButtonElement>("copyCodeButton");
const copyEmailButton = getElement<HTMLButtonElement>("copyEmailButton");
const statusBox = getElement<HTMLDivElement>("statusBox");
const codeBox = getElement<HTMLDivElement>("codeBox");
const rawPanel = getElement<HTMLElement>("rawPanel");
const rawBox = getElement<HTMLPreElement>("rawBox");

let latestCode = "";
let latestEmail = "";

rawPanel.hidden = !showDebug;

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function setStatus(message: string, type: "idle" | "ok" | "error" | "loading" = "idle") {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
}

function renderCode(status: "idle" | "loading" | "ok" | "error", code = "------", detail = "查询后显示最新一封邮件验证码。") {
  codeBox.className = `result-card ${status === "idle" ? "is-empty" : status}`;
  codeBox.replaceChildren();

  const codeElement = document.createElement("div");
  codeElement.className = code === "------" ? "verification-code muted-code" : "verification-code";
  codeElement.textContent = code;

  const badge = document.createElement("strong");
  badge.className = `badge ${status}`;
  badge.textContent = statusText(status);

  const detailElement = document.createElement("p");
  detailElement.className = "muted";
  detailElement.textContent = detail;

  codeBox.append(codeElement, badge, detailElement);
}

function statusText(status: "idle" | "loading" | "ok" | "error") {
  switch (status) {
    case "loading":
      return "查询中";
    case "ok":
      return "成功";
    case "error":
      return "失败";
    default:
      return "等待";
  }
}

async function queryMail() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    setStatus("请先输入邮箱。", "error");
    return;
  }

  latestCode = "";
  latestEmail = email;
  queryButton.disabled = true;
  copyCodeButton.disabled = true;
  copyEmailButton.disabled = true;
  queryButton.textContent = "获取中...";
  rawBox.textContent = "{}";
  renderCode("loading", "------", "正在查询最新邮件...");
  setStatus("正在查询 Hotmail 邮件...", "loading");

  try {
    const response = await fetch("/api/hotmail/manual_mail", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
      credentials: "same-origin",
    });
    const text = await response.text();
    const payload = parsePayload(text);
    rawBox.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

    if (!response.ok || payloadFailed(payload)) {
      throw new Error(errorFromPayload(payload) || `查询失败：${response.status}`);
    }

    const code = codeFromPayload(payload);
    const message = latestMessage(payload);
    if (!code) {
      renderCode("error", "------", detailFromPayload(payload) || "最新邮件中没有识别到验证码。");
      setStatus("未识别到验证码。", "error");
      copyEmailButton.disabled = false;
      return;
    }

    latestCode = code;
    renderCode("ok", code, messageDetail(message));
    copyCodeButton.disabled = false;
    copyEmailButton.disabled = false;
    setStatus("验证码已获取。", "ok");
  } catch (error) {
    renderCode("error", "------", error instanceof Error ? error.message : "查询失败。");
    setStatus(error instanceof Error ? error.message : "查询失败。", "error");
  } finally {
    queryButton.disabled = false;
    queryButton.textContent = "获取验证码";
  }
}

function parsePayload(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function payloadFailed(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return record.ok === false || record.success === false;
}

function latestMessage(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const messages = record.messages || record.emails;
  return Array.isArray(messages) ? messages[0] : null;
}

function codeFromPayload(payload: unknown) {
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = String((payload as { code?: unknown }).code || "").trim();
    if (code) {
      return code;
    }
  }
  return codeFromMessage(latestMessage(payload));
}

function codeFromMessage(message: unknown) {
  if (!message) {
    return "";
  }
  if (typeof message === "object" && "code" in message) {
    const code = String((message as { code?: unknown }).code || "").trim();
    if (code) {
      return code;
    }
  }
  const text = typeof message === "string" ? message : JSON.stringify(message);
  const match = text.match(/\b\d{4,8}\b/);
  return match?.[0] || "";
}

function messageDetail(message: unknown) {
  if (!message || typeof message !== "object") {
    return "已读取最新一封邮件。";
  }
  const record = message as Record<string, unknown>;
  const parts = [record.subject, record.from, record.date || record.time || record.receivedAt, record.folder].filter(Boolean).map(String);
  return parts.length ? parts.join(" · ") : "已读取最新一封邮件。";
}

function detailFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  return String(record.detail || record.hint || record.error || record.message || record.emptyReason || "");
}

function errorFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error || record.detail || record.message || "");
}

async function copyText(value: string, message: string) {
  if (!value) {
    return;
  }
  await navigator.clipboard?.writeText(value).catch(() => undefined);
  setStatus(message, "ok");
}

queryButton.addEventListener("click", queryMail);
copyCodeButton.addEventListener("click", () => copyText(latestCode, "验证码已复制。"));
copyEmailButton.addEventListener("click", () => copyText(latestEmail, "邮箱已复制。"));
emailInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    queryMail();
  }
});

renderCode("idle");
setStatus("等待输入邮箱。", "idle");
