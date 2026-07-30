import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // codebase/ is nested one level under the repo root; the transcript
    // data pack lives in ../data, outside Vite's default project root.
    fs: { allow: [".."] },
  },
});
