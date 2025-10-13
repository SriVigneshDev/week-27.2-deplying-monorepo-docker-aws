import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'standalone.js',
  minify: true,
  treeShaking: true,
  external: ['*.node'],
  drop: ['console', 'debugger'],
  keepNames: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});