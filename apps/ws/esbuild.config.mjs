import esbuild from 'esbuild';
import { copyFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

// Find Prisma using pnpm
const prismaClientPkg = execSync('pnpm list @prisma/client --json', { encoding: 'utf8' });
const parsed = JSON.parse(prismaClientPkg);
const prismaVersion = parsed[0]?.dependencies?.['@prisma/client']?.version || '6.17.1';

const prismaPath = join(__dirname, '..', '..', 'node_modules', '.pnpm', `@prisma+client@${prismaVersion}_prisma@${prismaVersion}_typescript@5.9.2__typescript@5.9.2`, 'node_modules', '.prisma', 'client');

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