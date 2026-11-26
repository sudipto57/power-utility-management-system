// Runs by itself after `npm install` in backend/ (the "prepare" script in package.json).
// It switches on the git hooks in .githooks/ (pre-commit + pre-push privacy check, see tools/privacy-check.mjs),
// so nobody can commit or push real customers' data or passwords by mistake.
// It never fails the install: on Render or GitHub (no hooks needed there) it just does nothing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  const onHostingOrCi = process.env.CI || process.env.RENDER;
  const hasHooks = fs.existsSync(path.join(projectRoot, '.githooks', 'pre-commit'));
  const isGitFolder = fs.existsSync(path.join(projectRoot, '.git'));
  if (!onHostingOrCi && hasHooks && isGitFolder) {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: projectRoot, stdio: 'ignore' });
    console.log('[privacy check] git hooks switched on: every commit and push is checked for personal data and passwords.');
  }
} catch {
  // git missing or not allowed: the GitHub check still runs on every push
}
