import { exchangeMailKeys, lookupMailCode } from "./api";
import { cacheKeyForCode, formatDateTime, normalizeCode, readCachedCredential, writeCachedCredential } from "./cache";
import { decryptPayload } from "./crypto";
import { getBeijingNow } from "./time";
import "./styles.css";
import type { ActiveSession, CachedMailCredential } from "./types";

const sessionBox = getElement<HTMLDivElement>("sessionBox");
const refreshButton = getElement<HTMLButtonElement>("refreshButton");
const copyButton = getElement<HTMLButtonElement>("copyButton");
const statusBox = getElement<HTMLDivElement>("statusBox");
const resultBox = getElement<HTMLDivElement>("resultBox");

let activeSession: ActiveSession | null = null;
let serverTimeOffset = 0;
let countdownTimer: ReturnType<typeof window.setInterval> | null = null;

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

function createText<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  return element;
}

function getServerNow() {
  return Date.now() + serverTimeOffset;
}

async function readLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const encrypted = params.get("p") || "";
  if (!encrypted) {
    throw new Error("当前链接缺少访问参数，请重新生成访问链接。");
  }

  let payload;
  try {
    payload = await decryptPayload(encrypted);
  } catch {
    throw new Error("访问参数解密失败，请重新生成访问链接。");
  }

  const expiresAt = Number(payload.expiresAt);
  const code = normalizeCode(payload.code);
  if (!code || !expiresAt || Number.isNaN(expiresAt) || !payload.duration) {
    throw new Error("访问参数不完整，请重新生成访问链接。");
  }

  const serverNow = await getBeijingNow();
  serverTimeOffset = serverNow - Date.now();
  if (serverNow > expiresAt) {
    throw new Error("当前访问链接已过期，请重新生成。");
  }

  return {
    code,
    duration: payload.duration,
    createdAt: Number(payload.createdAt) || 0,
    expiresAt,
  };
}

function isLinkValid() {
  return Boolean(activeSession && activeSession.expiresAt > getServerNow());
}

function renderSession() {
  sessionBox.replaceChildren();

  if (!activeSession) {
    sessionBox.appendChild(statusRow(false, "未加载"));
    refreshButton.disabled = true;
    copyButton.disabled = true;
    return;
  }

  const valid = isLinkValid();
  sessionBox.append(
    statusRow(valid, valid ? "有效" : "无效"),
    emailRow(activeSession.email || "等待获取邮箱"),
    validityRow(activeSession.duration, formatDateTime(activeSession.expiresAt), formatCountdown(activeSession.expiresAt - getServerNow())),
  );

  refreshButton.disabled = !activeSession.email || !activeSession.secret || activeSession.status === "loading" || !valid;
  copyButton.disabled = !activeSession.verificationCode;
}

function statusRow(valid: boolean, value: string) {
  const row = document.createElement("div");
  row.className = `session-status ${valid ? "valid" : "invalid"}`;
  row.append(createText("span", "有效状态"), createText("strong", value));
  return row;
}

function emailRow(email: string) {
  const row = document.createElement("div");
  row.className = "email-row";
  const label = createText("span", "邮箱名称", "email-label");
  const emailButton = document.createElement("button");
  emailButton.className = "email-value";
  emailButton.type = "button";
  emailButton.textContent = email;
  emailButton.disabled = !activeSession?.email;
  emailButton.addEventListener("click", copyEmail);

  const copyEmailButton = document.createElement("button");
  copyEmailButton.className = "email-copy secondary";
  copyEmailButton.type = "button";
  copyEmailButton.textContent = "复制邮箱";
  copyEmailButton.disabled = !activeSession?.email;
  copyEmailButton.addEventListener("click", copyEmail);

  row.append(label, emailButton, copyEmailButton);
  return row;
}

function validityRow(duration: string, expiresAt: string, countdown: string) {
  const row = document.createElement("div");
  row.className = "validity-row";
  row.append(infoItem("有效时长", duration), infoItem("有效期至", expiresAt), infoItem("剩余时间", countdown, "countdown-value"));
  return row;
}

function infoItem(label: string, value: string, valueClassName?: string) {
  const item = document.createElement("div");
  item.className = valueClassName ? "info-item countdown-item" : "info-item";
  item.append(createText("span", label), createText("strong", value, valueClassName));
  return item;
}

function formatCountdown(value: number) {
  const seconds = Math.max(0, Math.ceil(value / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  return [hours, minutes, restSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function renderResult() {
  resultBox.replaceChildren();

  if (!activeSession) {
    resultBox.className = "result-card is-empty";
    resultBox.textContent = "等待获取验证码。";
    return;
  }

  resultBox.className = `result-card ${activeSession.status}`;
  const code = createText("div", activeSession.verificationCode || "------", activeSession.verificationCode ? "verification-code" : "verification-code muted-code");
  const status = createText("strong", statusText(activeSession.status), `badge ${activeSession.status}`);
  const detail = [activeSession.message, activeSession.mailTimeLabel, activeSession.freshnessLabel].filter(Boolean).join(" · ");
  resultBox.append(code, status);
  if (detail) {
    resultBox.appendChild(createText("p", detail, "muted"));
  }
}

function statusText(status: ActiveSession["status"]) {
  switch (status) {
    case "idle":
      return "等待";
    case "loading":
      return "取码中";
    case "ok":
      return "成功";
    case "error":
      return "失败";
  }
}

function render() {
  renderSession();
  renderResult();
}

function startCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  countdownTimer = window.setInterval(() => {
    if (!activeSession) {
      return;
    }
    const wasValid = activeSession.expiresAt > getServerNow() - 1000;
    const valid = isLinkValid();
    if (!valid && wasValid && activeSession.status !== "loading") {
      setStatus("当前访问链接已过期，请重新生成。", "error");
    }
    renderSession();
  }, 1000);
}

function setBusy(busy: boolean) {
  refreshButton.disabled = busy || !activeSession?.email || !activeSession.secret || !isLinkValid();
  refreshButton.textContent = busy ? "获取中..." : "获取验证码";
}

async function ensureCredential() {
  if (!activeSession) {
    throw new Error("访问链接未加载。");
  }
  if (!isLinkValid()) {
    throw new Error("当前访问链接已过期，请重新生成。");
  }

  const cached = readCachedCredential(activeSession.cacheKey, getServerNow());
  if (cached?.email && cached.secret) {
    activeSession.email = cached.email;
    activeSession.secret = cached.secret;
    activeSession.loadedFromCache = true;
    return;
  }

  setStatus("正在换取邮箱和密钥...", "loading");
  const payload = await exchangeMailKeys(activeSession.code);
  const item = (payload.items || []).find((entry) => entry.ok && entry.email && entry.secret);
  if (!item?.email || !item.secret) {
    const failedMessage = (payload.items || []).find((entry) => !entry.ok)?.message;
    throw new Error(failedMessage || payload.detail || payload.message || "兑换码未换出可用邮箱。");
  }

  const now = getServerNow();
  const credential: CachedMailCredential = {
    code: activeSession.code,
    email: item.email,
    secret: item.secret,
    expiresAt: activeSession.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  writeCachedCredential(activeSession.cacheKey, credential);
  activeSession.email = credential.email;
  activeSession.secret = credential.secret;
  activeSession.loadedFromCache = false;
}

async function fetchVerificationCode() {
  if (!activeSession) {
    return;
  }
  if (!isLinkValid()) {
    setStatus("当前访问链接已过期，请重新生成。", "error");
    renderSession();
    return;
  }

  setBusy(true);
  activeSession.status = "loading";
  activeSession.message = "正在获取验证码";
  activeSession.verificationCode = "";
  activeSession.mailTimeLabel = "";
  activeSession.freshnessLabel = "";
  render();
  setStatus("正在获取验证码...", "loading");

  try {
    await ensureCredential();
    render();
    const payload = await lookupMailCode(activeSession.email, activeSession.secret);
    activeSession.verificationCode = payload.code || "";
    activeSession.status = payload.code ? "ok" : "error";
    activeSession.message = payload.code ? "已获取验证码" : payload.message || "暂未识别到验证码";
    activeSession.mailTimeLabel = payload.mail_time_label || "";
    activeSession.freshnessLabel = payload.freshness_label || "";
    setStatus(payload.code ? "验证码已更新。" : activeSession.message, payload.code ? "ok" : "error");
  } catch (error) {
    activeSession.status = "error";
    activeSession.message = error instanceof Error ? error.message : "获取验证码失败";
    setStatus(activeSession.message, "error");
  } finally {
    setBusy(false);
    render();
  }
}

async function copyText(value: string, message: string) {
  if (!value) {
    return;
  }
  await navigator.clipboard?.writeText(value).catch(() => undefined);
  setStatus(message, "ok");
}

function copyEmail() {
  copyText(activeSession?.email || "", "邮箱已复制。");
}

function copyVerificationCode() {
  copyText(activeSession?.verificationCode || "", "验证码已复制。");
}

async function boot() {
  try {
    const params = await readLinkParams();
    const cacheKey = await cacheKeyForCode(params.code);
    activeSession = {
      cacheKey,
      code: params.code,
      duration: params.duration,
      createdAt: params.createdAt,
      expiresAt: params.expiresAt,
      email: "",
      secret: "",
      loadedFromCache: false,
      status: "idle",
      verificationCode: "",
      message: "准备获取验证码",
      mailTimeLabel: "",
      freshnessLabel: "",
    };
    const cached = readCachedCredential(cacheKey, getServerNow());
    if (cached) {
      activeSession.email = cached.email;
      activeSession.secret = cached.secret;
      activeSession.loadedFromCache = true;
    }
    render();
    startCountdown();
    await fetchVerificationCode();
  } catch (error) {
    activeSession = null;
    render();
    setStatus(error instanceof Error ? error.message : "访问链接无效。", "error");
  }
}

refreshButton.addEventListener("click", fetchVerificationCode);
copyButton.addEventListener("click", copyVerificationCode);

render();
boot();
