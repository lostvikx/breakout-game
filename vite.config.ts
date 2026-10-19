import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built game works on GitHub Pages subpaths.
  base: "./",
  build: {
    target: "es2020",
  },
  server: {
    port: 5173,
  },
});
