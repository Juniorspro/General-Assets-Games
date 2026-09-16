#!/usr/bin/env node
// 3D template unified build gate.
//
// Runs BOTH diagnostics unconditionally — the architecture self-check and the
// TypeScript type check — and prints the full stdout/stderr of each, regardless
// of whether they pass or fail. This guarantees that a downstream repair agent
// sees every error (architecture + types) in a single build, instead of having
// the architecture gate short-circuit `&&` and mask the TypeScript errors.
//
// Exit semantics are identical to the old chained command: if either diagnostic
// fails, this script exits non-zero so the subsequent `vite build` does not run
// (no dist is produced on failure). Only when both pass does it exit 0.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Resolve a runnable `tsc`. Inside `bun run build` / `npm run build` the
// node_modules/.bin directory is already on PATH, so bare `tsc` works. When
// this script is run standalone (e.g. `node scripts/check-build.mjs`) PATH may
// not include it, so fall back to the local binary under node_modules/.bin.
function resolveTsc() {
  const localBin = join(process.cwd(), 'node_modules', '.bin', 'tsc');
  if (existsSync(localBin)) return localBin;
  return 'tsc';
}

function runStep(title, command, args) {
  const banner = `=== ${title} ===`;
  console.log(`\n${banner}`);
  // shell:true so PATH resolution (including node_modules/.bin during
  // `bun run build`) works for `tsc`; stdio inherited so the child's
  // stdout/stderr stream straight through into the captured build output.
  const result = spawnSync(command, args, {
    shell: true,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  // A spawn-level failure (e.g. command not found) surfaces as a null status
  // with an error; treat it as a failed step rather than silently passing.
  const exitCode = result.status === null ? 1 : result.status;
  if (result.error) {
    console.error(`[${title}] failed to spawn: ${result.error.message}`);
  }
  return exitCode === 0;
}

const architectureOk = runStep(
  'architecture self-check',
  'node',
  ['scripts/check-architecture.mjs'],
);

const typesOk = runStep('tsc --noEmit', resolveTsc(), ['--noEmit']);

const summary = `build diagnostics: architecture=${architectureOk ? 'PASS' : 'FAIL'} types=${typesOk ? 'PASS' : 'FAIL'}`;
console.log(`\n=== summary ===`);

if (architectureOk && typesOk) {
  console.log(summary);
  process.exit(0);
}

console.error(`${summary}`);
console.error('build diagnostics failed: fix the errors above before the build can produce dist.');
process.exit(1);
