import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirectoryPath, "..");
const testDistPath = path.join(repoRoot, ".test-dist");
const compiledTestsRoot = path.join(testDistPath, "tests");
const serverOnlyRegisterPath = path.join(testDistPath, "server-only-register.cjs");
const tscEntrypoint = path.join(
  repoRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
const testEnvDefaults = {
  NEXT_PUBLIC_APP_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  OPENAI_API_KEY: "test-openai-key",
};

for (const [name, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function collectCompiledTestFiles(rootDirectory) {
  const testFiles = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (/\.test\.js$/u.test(entry.name)) {
        testFiles.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDirectory)) {
    walk(rootDirectory);
  }

  return testFiles.sort();
}

fs.rmSync(testDistPath, { recursive: true, force: true });
run(process.execPath, [tscEntrypoint, "-p", "tsconfig.test.json"]);
fs.writeFileSync(
  serverOnlyRegisterPath,
  [
    'const Module = require("node:module");',
    'const path = require("node:path");',
    'const testDistSrcPath = path.join(process.cwd(), ".test-dist", "src");',
    'const serverOnlyStubPath = path.join(process.cwd(), ".test-dist", "__server_only_stub__.js");',
    "const originalResolveFilename = Module._resolveFilename;",
    "Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {",
    '  if (request.startsWith("@/")) {',
    '    const compiledRequest = path.join(testDistSrcPath, request.slice(2));',
    "    return originalResolveFilename.call(this, compiledRequest, parent, isMain, options);",
    "  }",
    '  if (request === "server-only") {',
    "    return serverOnlyStubPath;",
    "  }",
    "  return originalResolveFilename.call(this, request, parent, isMain, options);",
    "};",
    "require.cache[serverOnlyStubPath] = {",
    "  id: serverOnlyStubPath,",
    "  filename: serverOnlyStubPath,",
    "  loaded: true,",
    "  exports: {},",
    "};",
    "",
  ].join("\n"),
);

const compiledTestFiles = collectCompiledTestFiles(compiledTestsRoot);

if (compiledTestFiles.length === 0) {
  console.error("No compiled test files found.");
  process.exit(1);
}

run(process.execPath, ["--require", serverOnlyRegisterPath, "--test", ...compiledTestFiles]);
