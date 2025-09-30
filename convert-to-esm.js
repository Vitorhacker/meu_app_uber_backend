import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { replaceInFileSync } = require("replace-in-file");

// Converte require(...) para import ... from ...
const requireToImport = {
  files: "src/**/*.js",
  from: /const (\w+) = require\(["'](.+)["']\);/g,
  to: 'import $1 from "$2";',
};

// Converte module.exports = algo
const moduleExports = {
  files: "src/**/*.js",
  from: /module\.exports = (\w+);/g,
  to: "export default $1;",
};

// Converte exports.algumaCoisa = ...
const namedExports = {
  files: "src/**/*.js",
  from: /exports\.(\w+) = (\w+);/g,
  to: "export const $1 = $2;",
};

// Corrige imports relativos sem extensão -> adiciona .js
const fixRelativeImports = {
  files: "src/**/*.js",
  from: /from ["'](\.\/[^"']+)(?<!\.js)["'];/g,
  to: 'from "$1.js";',
};

try {
  replaceInFileSync(requireToImport);
  replaceInFileSync(moduleExports);
  replaceInFileSync(namedExports);
  replaceInFileSync(fixRelativeImports);

  console.log("✅ Conversão concluída para ESM!");
} catch (error) {
  console.error("❌ Erro na conversão:", error);
}
