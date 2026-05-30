import { formatCode, formatDateTime, normalizeCode } from "./cache";
import { encryptPayload } from "./crypto";
import "./styles.css";

const codeInput = getElement<HTMLInputElement>("codeInput");
const durationInput = getElement<HTMLInputElement>("durationInput");
const generateButton = getElement<HTMLButtonElement>("generateButton");
const copyLinkButton = getElement<HTMLButtonElement>("copyLinkButton");
const generatorStatus = getElement<HTMLDivElement>("generatorStatus");
const linkOutput = getElement<HTMLTextAreaElement>("linkOutput");

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function setStatus(message: string, type: "idle" | "ok" | "error" | "loading" = "idle") {
  generatorStatus.textContent = message;
  generatorStatus.dataset.type = type;
}

function normalizeDuration(value: string) {
  return value.trim().toLowerCase() || "1d";
}

function parseDuration(value: string) {
  const source = normalizeDuration(value);
  const match = source.match(/^(\d+)([hdwm])$/);
  if (!match) {
    throw new Error("有效期格式不正确，请使用 12h、1d、3d、7d、1m 这类格式。");
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("有效期必须是正整数。");
  }

  const day = 24 * 60 * 60 * 1000;
  switch (unit) {
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * day;
    case "w":
      return amount * 7 * day;
    case "m":
      return amount * 30 * day;
    default:
      throw new Error("不支持的有效期单位。");
  }
}

async function buildAccessLink(code: string, duration: string) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw new Error("请先输入兑换码。");
  }

  const normalizedDuration = normalizeDuration(duration);
  const createdAt = Date.now();
  const expiresAt = createdAt + parseDuration(normalizedDuration);
  const encrypted = await encryptPayload({
    code: formatCode(normalized),
    duration: normalizedDuration,
    expiresAt,
    createdAt,
  });
  const url = new URL("/", window.location.origin);
  url.searchParams.set("p", encrypted);
  return { link: url.toString(), expiresAt };
}

async function generateLink() {
  try {
    generateButton.disabled = true;
    setStatus("正在生成加密链接...", "loading");
    const { link, expiresAt } = await buildAccessLink(codeInput.value, durationInput.value);
    linkOutput.value = link;
    copyLinkButton.disabled = false;
    setStatus(`访问链接已生成，有效期至 ${formatDateTime(expiresAt)}。`, "ok");
  } catch (error) {
    linkOutput.value = "";
    copyLinkButton.disabled = true;
    setStatus(error instanceof Error ? error.message : "生成失败", "error");
  } finally {
    generateButton.disabled = false;
  }
}

async function copyLink() {
  if (!linkOutput.value) {
    return;
  }
  await navigator.clipboard?.writeText(linkOutput.value).catch(() => undefined);
  setStatus("访问链接已复制。", "ok");
}

generateButton.addEventListener("click", generateLink);
copyLinkButton.addEventListener("click", copyLink);
codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateLink();
  }
});
durationInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateLink();
  }
});
