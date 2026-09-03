#!/usr/bin/env node
// 3D template architecture self-check: a minimal lifecycle gate.
// It freezes runtime ownership (src/three/game.ts), the thin React shell,
// and the platform hook wiring — nothing else. Scene structure, file layout
// beyond the three core files, and coding style are intentionally unchecked.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC_DIR = join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const REQUIRED_FILES = ['src/App.tsx', 'src/three/game.ts', 'src/game/schema.ts'];

function sourceFiles(dir) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...sourceFiles(path));
    else if (SOURCE_EXTENSIONS.has(path.slice(path.lastIndexOf('.')))) output.push(path);
  }
  return output;
}

function stripCommentsAndStrings(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/`(?:\\.|[^`])*`/g, '``')
    .replace(/'(?:\\.|[^'])*'/g, "''")
    .replace(/"(?:\\.|[^"])*"/g, '""');
}

const errors = [];
const fail = (message) => errors.push(`- ${message}`);

for (const requiredPath of REQUIRED_FILES) {
  if (!existsSync(join(ROOT, requiredPath))) fail(`${requiredPath} must exist`);
}

const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : '');
const appText = read('src/App.tsx');
const gameText = read('src/three/game.ts');
const schemaText = read('src/game/schema.ts');

// Thin React shell: App mounts the canvas and hands off; it never owns the renderer.
if (!/<canvas\b[^>]*ref=\{canvasRef\}/.test(appText)) {
  fail('src/App.tsx must mount a native canvas with a canvasRef');
}
if (!/startGame\(\s*canvas\s*,/.test(appText)) {
  fail('src/App.tsx must call startGame(canvas, <runtime context>)');
}
if (!/\.dispose\s*\(\s*\)/.test(appText)) {
  fail('src/App.tsx cleanup must call the runtime handle.dispose()');
}
if (/new\s+(THREE\.)?WebGLRenderer\s*\(|setAnimationLoop\s*\(|requestAnimationFrame\s*\(/.test(stripCommentsAndStrings(appText))) {
  fail('src/App.tsx must stay a thin React shell — the renderer and render loop live in src/three/game.ts');
}

// Platform hooks stay wired.
if (!/useGameConfig\s*\(\s*SCHEMA\s*\)/.test(appText) || !/useInput\s*\(/.test(appText) || !/useScreen\s*\(/.test(appText)) {
  fail('src/App.tsx must keep the @rezona/core/3d config/input/screen platform hooks wired');
}
if (!/\.\.\.\s*\{?\s*input\.handlers\s*\}?/.test(appText)) {
  fail('src/App.tsx must spread input.handlers onto the DOM container');
}

// Runtime ownership: game.ts creates the renderer and owns the lifecycle.
if (!/export\s+(?:(?:async\s+)?function\s+startGame\s*\(|const\s+startGame\s*=\s*(?:async\s*)?\()\s*canvas\s*:\s*HTMLCanvasElement/.test(gameText)) {
  fail('src/three/game.ts must export startGame(canvas: HTMLCanvasElement, ...)');
}
if (!/new\s+(THREE\.)?WebGLRenderer\s*\(/.test(gameText)) {
  fail('src/three/game.ts must create the WebGLRenderer');
}
if (!/setAnimationLoop\s*\(|requestAnimationFrame\s*\(/.test(stripCommentsAndStrings(gameText))) {
  fail('src/three/game.ts must run a persistent render loop (setAnimationLoop or requestAnimationFrame) — a single static render is not a game');
}
if (!/\.render\s*\(/.test(gameText)) {
  fail('src/three/game.ts must render the scene');
}
if (!/phaseRef/.test(gameText)) {
  fail('src/three/game.ts must read phaseRef from the runtime context to gate the loop');
}
if (!/window\.addEventListener\s*\(\s*['"]resize['"]/.test(gameText) || !/window\.removeEventListener\s*\(\s*['"]resize['"]/.test(gameText)) {
  fail('src/three/game.ts must register and remove the resize listener in pairs');
}
if (!/renderer\.dispose\s*\(/.test(gameText)) {
  fail('src/three/game.ts dispose path must dispose the renderer');
}

// Editable config contract.
if (!/satisfies\s+EditableSchema/.test(schemaText)) {
  fail('src/game/schema.ts must export SCHEMA with `satisfies EditableSchema`');
}

// Browser code stays ESM; renderer creation stays inside src/three/.
for (const path of sourceFiles(SRC_DIR)) {
  const rel = relative(ROOT, path);
  const stripped = stripCommentsAndStrings(readFileSync(path, 'utf8'));
  if (/\brequire\s*\(/.test(stripped)) {
    fail(`${rel} must not use require() in a browser template`);
  }
  if (!rel.startsWith('src/three/') && /new\s+(THREE\.)?WebGLRenderer\s*\(/.test(stripped)) {
    fail(`${rel} must not create a WebGLRenderer — the renderer lives in src/three/`);
  }
}

if (errors.length > 0) {
  console.error('3D template architecture self-check failed:');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('3D template architecture self-check passed.');
