import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "core/index": "src/core/index.ts",
    "react/useClaudeCode": "src/react/useClaudeCode.ts",
    "svelte/useClaudeCode": "src/svelte/useClaudeCode.ts",
    "vue/useClaudeCode": "src/vue/useClaudeCode.ts",
  },
  format: ["esm"], // ESM only — Tauri uses Vite which is ESM-native
  dts: true,
  clean: true,
  minify: true, // esbuild minification
  treeshake: true, // explicit — never accidentally disabled
  sourcemap: true,
  external: ["react", "svelte", "vue", "@tauri-apps/api"],
});
