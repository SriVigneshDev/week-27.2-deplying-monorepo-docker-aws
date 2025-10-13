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
  external: [
    '@prisma/client',
    '.prisma/client',
    '*.node'
  ],
  drop: ['console', 'debugger'],
  keepNames: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  banner: {
    js: `
const { join } = require('path');
const __dirname_prisma = __dirname;
process.env.PRISMA_QUERY_ENGINE_LIBRARY = join(__dirname_prisma, 'libquery_engine-linux-musl-openssl-3.0.x.so.node');
    `.trim()
  }
});

// Copy Prisma binaries after build
const prismaClientPath = join(__dirname, 'node_modules', '.prisma', 'client');

if (existsSync(prismaClientPath)) {
  const files = readdirSync(prismaClientPath);
  
  // Copy all .node files and schema.prisma
  files.forEach(file => {
    if (file.endsWith('.node') || file === 'schema.prisma') {
      const src = join(prismaClientPath, file);
      const dest = join(__dirname, file);
      
      console.log(`📦 Copying ${file}...`);
      copyFileSync(src, dest);
    }
  });
  
  console.log('✅ Prisma binaries copied successfully!');
} else {
  console.error('❌ Prisma client not found! Run pnpm run generate:db first');
  process.exit(1);
}

console.log('✅ Build complete!');