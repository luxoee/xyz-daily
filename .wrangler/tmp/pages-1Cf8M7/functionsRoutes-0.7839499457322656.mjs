import { onRequestPost as __api_pickup_mail_code_js_onRequestPost } from "/Users/luxoee/workspace/github/xy_daily/functions/api/pickup/mail-code.js"
import { onRequestPost as __api_pickup_mail_keys_js_onRequestPost } from "/Users/luxoee/workspace/github/xy_daily/functions/api/pickup/mail-keys.js"
import { onRequest as __api_pickup_mail_code_js_onRequest } from "/Users/luxoee/workspace/github/xy_daily/functions/api/pickup/mail-code.js"
import { onRequest as __api_pickup_mail_keys_js_onRequest } from "/Users/luxoee/workspace/github/xy_daily/functions/api/pickup/mail-keys.js"
import { onRequestGet as __api_time_js_onRequestGet } from "/Users/luxoee/workspace/github/xy_daily/functions/api/time.js"
import { onRequest as __api_time_js_onRequest } from "/Users/luxoee/workspace/github/xy_daily/functions/api/time.js"

export const routes = [
    {
      routePath: "/api/pickup/mail-code",
      mountPath: "/api/pickup",
      method: "POST",
      middlewares: [],
      modules: [__api_pickup_mail_code_js_onRequestPost],
    },
  {
      routePath: "/api/pickup/mail-keys",
      mountPath: "/api/pickup",
      method: "POST",
      middlewares: [],
      modules: [__api_pickup_mail_keys_js_onRequestPost],
    },
  {
      routePath: "/api/pickup/mail-code",
      mountPath: "/api/pickup",
      method: "",
      middlewares: [],
      modules: [__api_pickup_mail_code_js_onRequest],
    },
  {
      routePath: "/api/pickup/mail-keys",
      mountPath: "/api/pickup",
      method: "",
      middlewares: [],
      modules: [__api_pickup_mail_keys_js_onRequest],
    },
  {
      routePath: "/api/time",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_time_js_onRequestGet],
    },
  {
      routePath: "/api/time",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_time_js_onRequest],
    },
  ]