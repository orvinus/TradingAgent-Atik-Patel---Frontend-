import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    // const backendUrl = env.VITE_BACKEND_URL;
    var backendUrl = (_b = env.VITE_BACKEND_URL) !== null && _b !== void 0 ? _b : "https://backend.tradingos.co.in";
    var dispatchApiKey = env.NOTIFICATIONS_DISPATCH_API_KEY;
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
                    rewrite: function (path) { return path.replace("/api/v1/admin/notifications", "/api/v1/notifications"); },
                    configure: function (proxy) {
                        proxy.on("proxyReq", function (proxyReq) {
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
