import { formatCode, formatDateTime, normalizeCode } from "./cache";
import { encryptPayload } from "./crypto";
import "./styles.css";

const defaultDuration = "7分钟";
const defaultDurationMs = 7 * 60 * 1000;

const codeInput = getElement<HTMLInputElement>("codeInput");
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

async function buildAccessLink(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw new Error("请先输入兑换码。");
  }

  const createdAt = Date.now();
  const expiresAt = createdAt + defaultDurationMs;
  const encrypted = await encryptPayload({
    code: formatCode(normalized),
    duration: defaultDuration,
    expiresAt,
    createdAt,
  });
  const url = new URL("/keria/", window.location.origin);
  url.searchParams.set("p", encrypted);
  return { link: url.toString(), expiresAt };
}

async function generateLink() {
  try {
    generateButton.disabled = true;
    setStatus("正在生成加密链接...", "loading");
    const { link, expiresAt } = await buildAccessLink(codeInput.value);
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
  linkOutput.select();
  await navigator.clipboard?.writeText(linkOutput.value).catch(() => undefined);
  setStatus("访问链接已复制。", "ok");
}

generateButton.addEventListener("click", generateLink);
copyLinkButton.addEventListener("click", copyLink);
linkOutput.addEventListener("click", copyLink);
codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateLink();
  }
});
