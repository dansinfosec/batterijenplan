import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Tijdens development gaan /api en /media calls naar Django
      "/api": "http://localhost:8000",
      "/media": "http://localhost:8000",
    },
  },
});
