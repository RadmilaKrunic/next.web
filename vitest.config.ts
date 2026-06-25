import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    typecheck: { tsconfig: "tsconfig.test.json" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.types.ts",
        "src/vite-env.d.ts",
        "src/setupTests.ts",
        "src/main.tsx",
        "src/components/ui/FileUpload/FileUpload.tsx",
        "src/components/ui/MessagesModal/MessagesPreview/MessagesPreview.tsx",
        "src/types/user.type.ts",
      ],
    },
  },
});
