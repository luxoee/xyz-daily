import { handleKedayaManualMail } from "./_shared.js";

export function onRequest(context) {
  return handleKedayaManualMail(context);
}
