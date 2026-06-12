import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL;
  const dispatchApiKey = env.NOTIFICATIONS_DISPATCH_API_KEY;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Dev-only: rewrite /api/v1/admin/notifications/dispatch/* →
        // /api/v1/notifications/dispatch/* and inject the dispatch key
        // server-side so it never reaches the browser bundle.
        // Remove this block once the real backend admin proxy is live.
        "/api/v1/admin/notifications": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace("/api/v1/admin/notifications", "/api/v1/notifications"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (dispatchApiKey) {
                proxyReq.setHeader("X-Notifications-Api-Key", dispatchApiKey);
              }
            });
          },
        },
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
