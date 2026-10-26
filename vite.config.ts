import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  define: {
    "import.meta.env.VITE_DEV_SESSION_ID": JSON.stringify(
      command === "serve" ? String(Date.now()) : "",
    ),
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
}));
