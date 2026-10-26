/**
 * 将项目根目录 .env 中的 KEY=VALUE 同步到 Vercel Production（需已 vercel login）。
 * 用法：在 carbonpie 根目录执行 node scripts/sync-env-to-vercel.mjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

const raw = readFileSync(envPath, 'utf8');
const pairs = [];
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq <= 0) continue;
  const name = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
  pairs.push({ name, val });
}

function isSensitive(name) {
  return /KEY|TOKEN|SECRET|PASSWORD|PASS|ARK_API/i.test(name);
}

for (const { name, val } of pairs) {
  const args = ['vercel', 'env', 'add', name, 'production'];
  if (isSensitive(name)) args.push('--sensitive');
  args.push('--yes', '--force');
  const r = spawnSync('npx', args, {
    cwd: root,
    input: val,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  });
  const err = (r.stderr || '').trim();
  const out = (r.stdout || '').trim();
  if (r.status !== 0) {
    console.error('FAIL', name, r.status, err || out);
    process.exitCode = 1;
  } else {
    console.log('OK', name);
  }
}
