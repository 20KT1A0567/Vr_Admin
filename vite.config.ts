import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = env.VITE_APP_BASE_PATH?.trim() || "/";

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
