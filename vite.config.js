import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var basePath = ((_b = env.VITE_APP_BASE_PATH) === null || _b === void 0 ? void 0 : _b.trim()) || "/";
    return {
        plugins: [react()],
        base: basePath,
        resolve: {
            alias: {
                api: "/src/api",
                components: "/src/components",
                pages: "/src/pages",
                store: "/src/store",
                theme: "/src/theme",
                styles: "/src/styles",
                types: "/src/types",
                utils: "/src/utils"
            }
        },
        server: {
            port: 5174,
            proxy: {
                "/api": {
                    target: env.VITE_API_PROXY_TARGET || "http://localhost:8080",
                    changeOrigin: true
                }
            }
        }
    };
});
