export interface MailKeyItem {
  code: string;
  ok: boolean;
  email?: string;
  masked_email?: string;
  secret?: string;
  message?: string;
}

export interface MailKeysResponse {
  ok: boolean;
  items?: MailKeyItem[];
  success_count?: number;
  fail_count?: number;
  detail?: string;
  message?: string;
}

export interface MailCodeResponse {
  ok?: boolean;
  code?: string;
  message?: string;
  detail?: string;
  mail_time_label?: string;
  freshness_label?: string;
  freshness_status?: string;
}

export interface CachedMailCredential {
  code: string;
  email: string;
  secret: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export type ResultStatus = "idle" | "loading" | "ok" | "error";

export interface ActiveSession {
  cacheKey: string;
  code: string;
  duration: string;
  createdAt: number;
  expiresAt: number;
  email: string;
  secret: string;
  loadedFromCache: boolean;
  status: ResultStatus;
  verificationCode: string;
  message: string;
  mailTimeLabel: string;
  freshnessLabel: string;
}
