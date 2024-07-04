import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    proxy: {
      "/api": {
        target: "https://cibm.ch",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    mimeTypes: {
      js: "application/javascript",
    },
  },
});
