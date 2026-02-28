import { execSync } from 'node:child_process';

try {
  console.log('Running npm install to regenerate package-lock.json...');
  const result = execSync('npm install --package-lock-only --ignore-scripts', {
    cwd: '/vercel/share/v0-project',
    timeout: 120000,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log(result);
  console.log('Lock file regenerated successfully!');
} catch (e) {
  console.error('Error:', e.message);
  if (e.stderr) console.error('stderr:', e.stderr);
  if (e.stdout) console.log('stdout:', e.stdout);
}
