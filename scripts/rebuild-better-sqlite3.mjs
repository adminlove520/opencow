import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const target = process.argv[2] || 'node';

if (platform() === 'darwin' || platform() === 'linux') {
  const rebuildScript = join(__dirname, 'rebuild-better-sqlite3.sh');
  if (existsSync(rebuildScript)) {
    console.log(`[rebuild] Running ${target} rebuild for better-sqlite3...`);
    try {
      execSync(`bash "${rebuildScript}" ${target}`, { stdio: 'inherit' });
    } catch (err) {
      console.warn('[rebuild] Rebuild failed (non-critical):', err.message);
    }
  }
} else {
  console.log(`[rebuild] Skipping bash-based rebuild on ${platform()}. (Assuming prebuilts are okay or manual rebuild needed)`);
}
