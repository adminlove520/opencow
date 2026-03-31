import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (platform() === 'darwin') {
  const patchScript = join(__dirname, 'patch-electron-name.sh');
  if (existsSync(patchScript)) {
    console.log('[postinstall] Running macOS-specific patch...');
    try {
      execSync(`bash "${patchScript}"`, { stdio: 'inherit' });
    } catch (err) {
      console.warn('[postinstall] macOS patch failed (non-critical):', err.message);
    }
  }
} else {
  console.log('[postinstall] Skipping macOS-specific patch on ' + platform());
}
