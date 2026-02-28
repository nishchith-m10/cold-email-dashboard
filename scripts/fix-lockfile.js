import { execSync } from 'child_process';

console.log('Regenerating package-lock.json...');
try {
  execSync('npm install --package-lock-only', { 
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit' 
  });
  console.log('Done!');
} catch (e) {
  console.error('Error:', e.message);
}
