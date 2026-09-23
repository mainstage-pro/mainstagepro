import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees y sesiones de Claude Code: son copias del repo, no código fuente.
    // Sin esto el lint reporta dos veces cada problema, y encima sobre una copia vieja.
    ".claude/**",
    // Basura de raíz: parches y borradores de un solo uso, nunca se despliegan.
    "patch*.js",
    "parse_brackets.js",
    "scratch/**",
    "scratch*.js",
    "scratch*.ts",
    "scratch*.tsx",
  ]),
  {
    // Los scripts de `scripts/` son operaciones one-off contra la BD (SQL crudo vía
    // driver HTTP), no código de la app: ahí `any` es el tipo honesto de una fila sin
    // esquema. Se siguen revisando las demás reglas.
    files: ["scripts/**", "prisma/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // Los `.js` de scripts/ corren en Node como CommonJS; ahí `require` es correcto.
    files: ["scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
