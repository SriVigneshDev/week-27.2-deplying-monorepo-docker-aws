import esbuild from 'esbuild';
import { copyFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build
await esbuild.build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'standalone.js',
  minify: true,
  treeShaking: true,
  external: ['@prisma/client', '.prisma/client'],
  drop: ['console', 'debugger'],
  keepNames: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

// Copy Prisma files
const prismaPath = join(__dirname, '..', '..', 'node_modules', '.prisma', 'client');

if (existsSync(prismaPath)) {
  readdirSync(prismaPath)
    .filter(f => f.endsWith('.node') || f === 'schema.prisma')
    .forEach(file => {
      copyFileSync(join(prismaPath, file), join(__dirname, file));
      console.log(`✅ Copied ${file}`);
    });
} else {
  console.error('❌ Prisma not found at:', prismaPath);
  process.exit(1);
}