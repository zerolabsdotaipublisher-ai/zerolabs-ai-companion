import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirectoryPath, "..");
const testDistPath = path.join(repoRoot, ".test-dist");
const compiledTestsRoot = path.join(testDistPath, "tests");
const tscEntrypoint = path.join(
  repoRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

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

const compiledTestFiles = collectCompiledTestFiles(compiledTestsRoot);

if (compiledTestFiles.length === 0) {
  console.error("No compiled test files found.");
  process.exit(1);
}

run(process.execPath, ["--test", ...compiledTestFiles]);
