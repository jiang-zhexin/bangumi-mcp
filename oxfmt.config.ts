import { defineConfig } from "oxfmt";

export default defineConfig({
  sortImports: true,
  ignorePatterns: ["*.json", "*.md", "*.yml", "*.yaml", "worker-configuration.d.ts"],
});
