import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin-panel/",
  resolve: {
    alias: {
      api: "/src/api",
      components: "/src/components",
      pages: "/src/pages",
      store: "/src/store",
      styles: "/src/styles",
      types: "/src/types",
      utils: "/src/utils"
    }
  },
  server: {
    port: 5174
  }
});
