import react from "@vitejs/plugin-react-swc";
import { defineConfig, configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      components: path.resolve(__dirname, "./src/components"),
      react: "react",
      "react-dom": "react-dom",
    },
    dedupe: ["react", "react-dom"],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true, // enables describe/it without import
    css: true, // if you import css/scss in components
    // original/ is a static reference snapshot of the pristine codebase (for diffing against
    // upstream changes), not code under test here — its own *.test.tsx files would otherwise
    // be picked up too, and fail regardless since its imports resolve against ./src via the
    // aliases above, not ./original/src.
    exclude: [...configDefaults.exclude, "original/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      exclude: [
        "**/src/main.tsx",
        "**/src/vite-env.d.ts",
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "original/**",
        "**/*.d.ts",
        "**/*config.{js,ts,mjs,mts,cjs,cts}",
        "**/*.config.{js,ts,mjs,mts,cjs,cts}",
        "**/vite.config.*",
        "**/tailwind.config.*",
        "**/postcss.config.*",
        "**/eslint.config.*",
        "**/commitlint.config.*",
      ],
    },
    typecheck: {
      tsconfig: "tsconfig.test.json",
    },
  },
});
