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
// In pnpm monorepo, the .pnpm store is at workspace root (../../node_modules/.pnpm)
const workspaceRoot = join(__dirname, '..', '..');
const pnpmPrismaPath = join(workspaceRoot, 'node_modules', '.pnpm');
let prismaEnginePath = null;

// Find the actual Prisma client path in pnpm store
if (existsSync(pnpmPrismaPath)) {
  const pnpmDirs = readdirSync(pnpmPrismaPath);
  const prismaDir = pnpmDirs.find(d => d.startsWith('@prisma+client'));
  
  if (prismaDir) {
    // The actual .prisma/client folder is inside the @prisma/client package
    const possiblePath = join(pnpmPrismaPath, prismaDir, 'node_modules', '.prisma', 'client');
    if (existsSync(possiblePath)) {
      prismaEnginePath = possiblePath;
      console.log(`📦 Found Prisma binaries at: ${possiblePath}`);
    }
  }
}

// Alternative: Check if Prisma client exists in the resolved location
if (!prismaEnginePath) {
  const alternativePath = join(workspaceRoot, 'node_modules', '.prisma', 'client');
  if (existsSync(alternativePath)) {
    prismaEnginePath = alternativePath;
    console.log(`📦 Found Prisma binaries at alternative path: ${alternativePath}`);
  }
}

if (prismaEnginePath && existsSync(prismaEnginePath)) {
  const outputPath = join(__dirname, '.prisma', 'client');
  mkdirSync(outputPath, { recursive: true });
  
  // Copy all files from Prisma client directory
  const files = readdirSync(prismaEnginePath);
  console.log(`📋 Copying ${files.length} Prisma files...`);
  
  files.forEach(file => {
    const src = join(prismaEnginePath, file);
    const dest = join(outputPath, file);
    if (statSync(src).isFile()) {
      copyFileSync(src, dest);
      console.log(`  ✓ Copied: ${file}`);
    }
  });
  
  console.log('✅ Prisma binaries copied successfully');
} else {
  console.error('❌ Prisma binaries not found');
  console.error('Searched paths:');
  console.error(`  - pnpm store: ${pnpmPrismaPath}`);
  console.error(`  - alternative: ${join(workspaceRoot, 'node_modules', '.prisma', 'client')}`);
  process.exit(1);
}