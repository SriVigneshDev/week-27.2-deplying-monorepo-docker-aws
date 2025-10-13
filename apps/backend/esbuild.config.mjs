import esbuild from 'esbuild';
import { copyFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'standalone.js',
  minify: true,
  treeShaking: true,
  external: ['.prisma/client'], // Only external the .prisma/client, NOT @prisma/client
  drop: ['console', 'debugger'],
  keepNames: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

// Copy Prisma binaries
const prismaPath = '/app/node_modules/.pnpm/@prisma+client@6.17.1_prisma@6.17.1_typescript@5.9.2__typescript@5.9.2/node_modules/.prisma/client';

if (existsSync(prismaPath)) {
  readdirSync(prismaPath)
    .filter(f => f.endsWith('.node') || f === 'schema.prisma')
    .forEach(file => {
      copyFileSync(join(prismaPath, file), join(__dirname, file));
      console.log(`✅ Copied ${file}`);
    });
} else {
  console.error('❌ Prisma not found');
  process.exit(1);
}