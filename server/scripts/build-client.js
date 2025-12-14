#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = path.join(__dirname, '..');
const clientDir = path.join(root, '..', 'client');

function log(...args) {
  console.log('[build-client]', ...args);
}

if (!fs.existsSync(clientDir)) {
  log('No client directory found at', clientDir, '- skipping client build');
  process.exit(0);
}

const pkgPath = path.join(clientDir, 'package.json');
if (!fs.existsSync(pkgPath)) {
  log('No client package.json found - skipping client build');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.scripts || !pkg.scripts.build) {
  log('Client package.json has no `build` script - skipping client build');
  process.exit(0);
}

// Install client dependencies (production install) then run build
log('Installing client dependencies (omit dev)');
let res = spawnSync('npm', ['ci', '--omit=dev'], { cwd: clientDir, stdio: 'inherit' });
if (res.error) {
  console.error('[build-client] npm ci failed:', res.error);
  process.exit(1);
}
if (res.status !== 0) process.exit(res.status);

log('Running client build');
res = spawnSync('npm', ['run', 'build'], { cwd: clientDir, stdio: 'inherit' });
if (res.error) {
  console.error('[build-client] npm run build failed:', res.error);
  process.exit(1);
}
if (res.status !== 0) process.exit(res.status);

log('Client build complete');
