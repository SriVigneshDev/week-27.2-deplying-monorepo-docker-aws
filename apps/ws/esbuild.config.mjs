import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./dist/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'standalone.js',
  minify: true,
  external: ['@prisma/client', '.prisma/client'],  // Don't bundle Prisma
});

console.log('✅ Bundle complete');