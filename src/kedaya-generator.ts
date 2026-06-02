import "./styles.css";

const emailInput = getElement<HTMLInputElement>("emailInput");
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

async function generateLink() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    setStatus("请先输入邮箱。", "error");
    return;
  }

  generateButton.disabled = true;
  copyLinkButton.disabled = true;
  generateButton.textContent = "生成中...";
  linkOutput.value = "";
  setStatus("正在生成访问链接...", "loading");

  try {
    const url = new URL("/api/kedaya/link/generate", window.location.origin);
    url.searchParams.set("email", email);
    url.searchParams.set("minutes", "10");
    const response = await fetch(url, {
      headers: { accept: "text/plain" },
      cache: "no-store",
      credentials: "same-origin",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(errorMessage(text) || `生成失败：${response.status}`);
    }

    linkOutput.value = text.trim();
    copyLinkButton.disabled = false;
    setStatus("访问链接已生成。", "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "生成失败。", "error");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "生成链接";
  }
}

function errorMessage(value: string) {
  try {
    const payload = JSON.parse(value) as { detail?: string; error?: string; message?: string };
    return payload.detail || payload.error || payload.message || "";
  } catch {
    return value.trim();
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
emailInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateLink();
  }
});
