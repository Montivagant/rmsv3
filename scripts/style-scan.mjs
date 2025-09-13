#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const exts = new Set(['.ts', '.tsx', '.jsx']);
const colorPatterns = [
  /text-(white|gray|slate|neutral)\b/g,
  /bg-(white|black|gray|blue|slate|neutral)\b/g
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(p.slice(p.lastIndexOf('.')))) scanFile(p);
  }
}

let totalHits = 0;
function scanFile(p) {
  const src = readFileSync(p, 'utf8');
  const lines = src.split('\n');

  // Inline style blocks - collect multi-line blocks and ignore pure CSS var sets
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf('style={{');
    if (idx !== -1) {
      // Capture up to next 5 lines to approximate the style object
      const block = [line];
      for (let j = 1; j <= 5 && i + j < lines.length; j++) {
        block.push(lines[i + j]);
        if (lines[i + j].includes('}}')) break;
      }
      const blockText = block.join(' ');
      const hasOnlyVars = /\['--/.test(blockText) && !/(width\s*:|height\s*:|top\s*:|left\s*:|right\s*:|bottom\s*:|userSelect|touchAction)/.test(blockText);
      if (!hasOnlyVars) {
        totalHits++;
        console.log(`${p}:${i + 1}: match inline style`);
      }
    }
  }

  // Hardcoded color utility classes
  colorPatterns.forEach((re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      totalHits++;
      const before = src.slice(0, m.index);
      const line = before.split('\n').length;
      console.log(`${p}:${line}: match ${re}`);
    }
  });
}

walk('src');
console.log(`\nScan complete. Matches: ${totalHits}`);


