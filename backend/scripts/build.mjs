#!/usr/bin/env node
/**
 * Backend 빌드: prisma generate 후 esbuild로 src/index.ts를 dist/index.js로 번들.
 * 타입 체크는 하지 않음(개발 시 IDE·vitest에서 tsc/타입 사용). 배포용 실행 파일만 생성.
 */
import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

execSync('pnpm run db:generate', { cwd: rootDir, stdio: 'inherit' });
await mkdir(join(rootDir, 'dist'), { recursive: true });

await esbuild.build({
  entryPoints: [join(rootDir, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(rootDir, 'dist/index.js'),
  packages: 'external',
  sourcemap: true,
  target: 'node20',
});

console.log('Backend build done: dist/index.js');
