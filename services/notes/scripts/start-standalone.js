const { cpSync, mkdirSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, '.next', 'static');
const dst = path.join(root, '.next', 'standalone', '.next', 'static');

mkdirSync(path.dirname(dst), { recursive: true });
cpSync(src, dst, { recursive: true, force: true });

execSync('node .next/standalone/server.js', { stdio: 'inherit', cwd: root });
