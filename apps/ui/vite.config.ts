import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@nexternel/plugin-sdk": path.resolve(root, "../../packages/plugin-sdk/src/index.ts"),
      "@nexternel/plugin-example-clock": path.resolve(
        root,
        "../../packages/plugin-example-clock/src/index.tsx"
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
