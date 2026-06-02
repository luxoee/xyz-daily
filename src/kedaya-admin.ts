import { decryptPayload } from "./crypto";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const showDebug = params.get("debug") === "true";
const accessToken = params.get("p") || "";

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
let expiresAt = 0;
let countdownTimer: ReturnType<typeof window.setInterval> | null = null;

rawPanel.hidden = !showDebug;
emailInput.readOnly = Boolean(accessToken) && !showDebug;

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

async function boot() {
  if (!accessToken) {
    renderCode("idle");
    setStatus("等待输入邮箱。", "idle");
    return;
  }

  try {
    const payload = await decryptPayload(accessToken);
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      throw new Error("访问参数不是 Kedaya 邮箱链接。");
    }
    expiresAt = Number(payload.expiresAt) || 0;
    if (Date.now() > expiresAt) {
      throw new Error("当前访问链接已过期。");
    }
    emailInput.value = email;
    latestEmail = email;
    startCountdown();
    await queryMail();
  } catch {
    emailInput.value = accessToken.includes("@") ? accessToken : "";
    latestEmail = emailInput.value;
    if (emailInput.value) {
      setStatus("已自动填入邮箱；明文 p 链接不能限制有效期，请使用生成接口生成加密链接。", "idle");
      renderCode("idle", "------", "点击获取验证码。明文 p 不具备服务端有效期限制。");
    } else {
      setStatus("访问参数无效，请重新生成链接。", "error");
      renderCode("error", "------", "访问参数无效。");
    }
  }
}

function startCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
  countdownTimer = window.setInterval(() => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      setStatus("当前访问链接已过期。", "error");
      queryButton.disabled = true;
      window.clearInterval(countdownTimer!);
      return;
    }
    if (!queryButton.disabled) {
      setStatus(`链接有效，剩余 ${formatCountdown(remaining)}。`, "ok");
    }
  }, 1000);
}

function formatCountdown(value: number) {
  const seconds = Math.max(0, Math.ceil(value / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

async function queryMail() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    setStatus("请先输入邮箱。", "error");
    return;
  }
  if (expiresAt && Date.now() > expiresAt) {
    setStatus("当前访问链接已过期。", "error");
    return;
  }

  latestCode = "";
  latestEmail = email;
  queryButton.disabled = true;
  copyCodeButton.disabled = true;
  copyEmailButton.disabled = true;
  queryButton.textContent = "获取中...";
  rawBox.textContent = "{}";
  renderCode("loading", "------", "正在查询最新一封邮件...");
  setStatus("正在查询 Kedaya 邮件...", "loading");

  try {
    const response = await fetch("/api/kedaya/manual_mail", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email, p: accessToken }),
      cache: "no-store",
      credentials: "same-origin",
    });
    const text = await response.text();
    const payload = parsePayload(text);
    rawBox.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

    if (!response.ok) {
      throw new Error(errorFromPayload(payload) || `查询失败：${response.status}`);
    }

    const message = latestMessage(payload);
    const code = codeFromMessage(message);
    if (!code) {
      renderCode("error", "------", detailFromPayload(payload) || "最新邮件中没有识别到验证码。");
      setStatus("未识别到验证码。", "error");
      return;
    }

    latestCode = code;
    renderCode("ok", code, messageDetail(message));
    copyCodeButton.disabled = false;
    copyEmailButton.disabled = false;
    setStatus(expiresAt ? `验证码已获取，链接剩余 ${formatCountdown(expiresAt - Date.now())}。` : "验证码已获取。", "ok");
  } catch (error) {
    renderCode("error", "------", error instanceof Error ? error.message : "查询失败。");
    setStatus(error instanceof Error ? error.message : "查询失败。", "error");
  } finally {
    queryButton.disabled = Boolean(expiresAt && Date.now() > expiresAt);
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

function latestMessage(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || !("messages" in payload)) {
    return null;
  }
  const messages = (payload as { messages?: unknown }).messages;
  return Array.isArray(messages) ? messages[0] : null;
}

function codeFromMessage(message: unknown) {
  if (!message) {
    return "";
  }
  if (typeof message === "object" && "code" in message) {
    return String((message as { code?: unknown }).code || "").trim();
  }
  const match = JSON.stringify(message).match(/\b\d{4,8}\b/);
  return match?.[0] || "";
}

function messageDetail(message: unknown) {
  if (!message || typeof message !== "object") {
    return "已读取最新一封邮件。";
  }
  const record = message as Record<string, unknown>;
  const parts = [record.subject, record.from, record.date || record.time || record.receivedAt].filter(Boolean).map(String);
  return parts.length ? parts.join(" · ") : "已读取最新一封邮件。";
}

function detailFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  return String(record.hint || record.error || record.message || record.emptyReason || "");
}

function errorFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  return String(record.error || record.detail || record.message || "");
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

boot();
