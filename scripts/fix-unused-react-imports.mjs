#!/usr/bin/env node

/**
 * Script to systematically find and fix unused React imports
 * Usage: node scripts/fix-unused-react-imports.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { execSync } from 'child_process';

console.log('🔍 Finding files with unused React imports...');

try {
  // Run TypeScript compiler to find unused React imports
  const tscOutput = execSync('pnpm exec tsc --noEmit 2>&1', { encoding: 'utf8' });
  
  // Parse TSC output for unused React import errors (TS6133)
  const unusedReactImports = [];
  const lines = tscOutput.split('\n');
  
  for (const line of lines) {
    if (line.includes('6133') && line.includes("'React' is declared but its value is never read")) {
      const match = line.match(/^(.+\.tsx?)\((\d+),(\d+)\):/);
      if (match) {
        const [, filePath, lineNum] = match;
        unusedReactImports.push({ filePath, lineNum: parseInt(lineNum) });
      }
    }
  }
  
  if (unusedReactImports.length === 0) {
    console.log('✅ No unused React imports found!');
    process.exit(0);
  }
  
  console.log(`📋 Found ${unusedReactImports.length} files with unused React imports:`);
  unusedReactImports.forEach(({ filePath }) => console.log(`  - ${filePath}`));
  
  // Fix each file
  let fixedCount = 0;
  
  for (const { filePath } of unusedReactImports) {
    try {
      console.log(`🔧 Fixing ${filePath}...`);
      
      const content = readFileSync(filePath, 'utf8');
      
      // Remove unused React import patterns
      const patterns = [
        // Remove "React, " from import statements
        /import React, \{/g,
        // Remove standalone React import
        /import React from 'react';\s*\n/g,
        // Clean up remaining comma-space patterns
        /import \{ /g
      ];
      
      let newContent = content;
      
      // Remove "import React from 'react';" if it's on its own line
      newContent = newContent.replace(/^import React from 'react';\s*$/gm, '');
      
      // Remove "React, " from combined imports like "import React, { useState }"
      newContent = newContent.replace(/import React, \{/g, 'import {');
      
      // Clean up any double spaces that might result
      newContent = newContent.replace(/import  \{/g, 'import {');
      
      if (newContent !== content) {
        writeFileSync(filePath, newContent, 'utf8');
        fixedCount++;
        console.log(`  ✅ Fixed ${filePath}`);
      } else {
        console.log(`  ⚠️  No changes needed for ${filePath}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error fixing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} out of ${unusedReactImports.length} files`);
  
  // Run TSC again to verify fixes
  console.log('\n🔍 Verifying fixes...');
  try {
    execSync('pnpm exec tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ All TypeScript errors resolved!');
  } catch (error) {
    console.log('⚠️  Some TypeScript errors remain. Run `pnpm exec tsc --noEmit` to see details.');
  }
  
} catch (error) {
  if (error.status === 1) {
    // TSC found errors, which is expected when looking for unused imports
    console.log('✅ TypeScript compilation completed (errors expected during scan)');
  } else {
    console.error('❌ Error running TypeScript compiler:', error.message);
    process.exit(1);
  }
}
