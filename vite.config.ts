import { resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

function devTimeApi(): Plugin {
  return {
    name: "dev-time-api",
    configureServer(server) {
      server.middlewares.use("/api/time", (request, response) => {
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Allow", "GET");
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ detail: "Method Not Allowed" }));
          return;
        }

        const now = Date.now();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify({ ok: true, now, timezone: "Asia/Shanghai" }));
      });
    },
  };
}

export default defineConfig({
  plugins: [devTimeApi()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        gen: resolve(__dirname, "gen/index.html"),
        generator: resolve(__dirname, "generator.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api/pickup": {
        target: "https://plus.keria.cc.cd",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
