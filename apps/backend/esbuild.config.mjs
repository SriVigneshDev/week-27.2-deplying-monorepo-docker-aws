import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

console.log('🔨 Building standalone bundle...');

await esbuild.build({
  entryPoints: [join(distDir, 'index.js')],
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

console.log('✅ Bundle complete - everything inlined');