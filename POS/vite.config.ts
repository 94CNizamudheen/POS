import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 1420,
    strictPort: true,
  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
      "@ui": fileURLToPath(new URL("src/UI", import.meta.url)),
      "@assets": fileURLToPath(new URL("src/assets", import.meta.url)),
      "@db": fileURLToPath(new URL("src/db", import.meta.url)),
      "@services": fileURLToPath(new URL("src/services", import.meta.url)),
      "@hooks": fileURLToPath(new URL("src/hooks", import.meta.url)),
      "@types": fileURLToPath(new URL("src/types", import.meta.url)),
    },
  },
});
