import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "src/api/schema.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["**/*.{js,mjs}", "eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { URL: "readonly", console: "readonly", process: "readonly" },
      parserOptions: { projectService: false },
    },
  },
  prettier,
);
