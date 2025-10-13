import esbuild from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building standalone bundle...');

await esbuild.build({
  entryPoints: [join(__dirname, 'dist', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: join(outDir, 'standalone.js'),
  minify: true,
  treeShaking: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

console.log('✅ Bundle complete - everything inlined');