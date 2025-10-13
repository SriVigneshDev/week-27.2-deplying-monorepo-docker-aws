import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building standalone bundle...');

await esbuild.build({
  entryPoints: [join(__dirname, 'dist', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: join(__dirname, 'standalone.js'),
  minify: true,
  treeShaking: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

console.log('✅ Bundle complete');

// Copy Prisma binaries
const workspaceRoot = join(__dirname, '..', '..');
const pnpmStorePath = join(workspaceRoot, 'node_modules', '.pnpm');
let prismaEnginePath = null;

// Find the Prisma client in pnpm store
if (existsSync(pnpmStorePath)) {
  console.log(`🔍 Searching for Prisma binaries in: ${pnpmStorePath}`);
  
  const pnpmDirs = readdirSync(pnpmStorePath);
  
  // Look for @prisma+client directory (it will have version and deps in the name)
  const prismaDirs = pnpmDirs.filter(d => d.startsWith('@prisma+client@'));
  console.log(`📦 Found ${prismaDirs.length} Prisma client directories`);
  
  for (const dir of prismaDirs) {
    const possiblePath = join(pnpmStorePath, dir, 'node_modules', '.prisma', 'client');
    console.log(`  Checking: ${dir}`);
    
    if (existsSync(possiblePath)) {
      prismaEnginePath = possiblePath;
      console.log(`  ✓ Found binaries at: ${possiblePath}`);
      
      // List files in the directory
      const files = readdirSync(possiblePath);
      console.log(`  📋 Contains ${files.length} files:`, files.filter(f => f.endsWith('.node') || f.endsWith('.so')).join(', '));
      break;
    }
  }
}

if (prismaEnginePath && existsSync(prismaEnginePath)) {
  const outputPath = join(__dirname, '.prisma', 'client');
  mkdirSync(outputPath, { recursive: true });
  
  // Copy all files from Prisma client directory
  const files = readdirSync(prismaEnginePath);
  let copiedCount = 0;
  
  files.forEach(file => {
    const src = join(prismaEnginePath, file);
    const dest = join(outputPath, file);
    const stat = statSync(src);
    
    if (stat.isFile()) {
      copyFileSync(src, dest);
      copiedCount++;
      
      // Make binary files executable
      if (file.endsWith('.node') || file.endsWith('.so') || !file.includes('.')) {
        const fs = require('fs');
        fs.chmodSync(dest, 0o755);
      }
    }
  });
  
  console.log(`✅ Copied ${copiedCount} Prisma files to ${outputPath}`);
} else {
  console.error('❌ Prisma binaries not found');
  console.error('Debug info:');
  console.error(`  - Workspace root: ${workspaceRoot}`);
  console.error(`  - pnpm store exists: ${existsSync(pnpmStorePath)}`);
  
  if (existsSync(pnpmStorePath)) {
    const dirs = readdirSync(pnpmStorePath);
    const prismaDirs = dirs.filter(d => d.includes('prisma'));
    console.error(`  - Prisma-related dirs in store: ${prismaDirs.join(', ')}`);
  }
  
  // Don't fail the build, let's try alternative approach
  console.warn('⚠️ Will try to copy from alternative location during Docker build');
}