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

// Copy Prisma binaries only
const pnpmPrismaPath = join(__dirname, 'node_modules', '.pnpm');
let prismaEnginePath = null;

// Find the actual Prisma client path in pnpm store
if (existsSync(pnpmPrismaPath)) {
  const pnpmDirs = readdirSync(pnpmPrismaPath);
  const prismaDir = pnpmDirs.find(d => d.startsWith('@prisma+client'));
  
  if (prismaDir) {
    prismaEnginePath = join(pnpmPrismaPath, prismaDir, 'node_modules', '.prisma', 'client');
  }
}

if (prismaEnginePath && existsSync(prismaEnginePath)) {
  const outputPath = join(__dirname, '.prisma', 'client');
  mkdirSync(outputPath, { recursive: true });
  
  readdirSync(prismaEnginePath).forEach(file => {
    const src = join(prismaEnginePath, file);
    const dest = join(outputPath, file);
    if (statSync(src).isFile()) {
      copyFileSync(src, dest);
    }
  });
  
  console.log('✅ Prisma binaries copied');
} else {
  console.error('❌ Prisma binaries not found');
  process.exit(1);
}