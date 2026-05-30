const password = "nfs";

export interface LinkPayload {
  code: string;
  duration: string;
  expiresAt: number;
  createdAt: number;
}

export async function encryptPayload(payload: LinkPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey();
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const packed = new Uint8Array(iv.byteLength + encrypted.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(encrypted), iv.byteLength);
  return base64UrlEncode(packed);
}

export async function decryptPayload(value: string): Promise<LinkPayload> {
  const packed = base64UrlDecode(value);
  if (packed.byteLength <= 12) {
    throw new Error("访问参数无效。");
  }

  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const key = await deriveKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  const payload = JSON.parse(new TextDecoder().decode(decrypted)) as LinkPayload;

  if (!payload.code || !payload.expiresAt || !payload.duration) {
    throw new Error("访问参数不完整。");
  }
  return payload;
}

async function deriveKey() {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
