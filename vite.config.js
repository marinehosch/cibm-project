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
    // Ajoutez la configuration du type MIME si nécessaire
    mimeTypes: {
      js: "application/javascript",
    },
  },
});
