import { writeFileSync } from 'node:fs';

// Fetch the package-lock.json from the main branch of the GitHub repo
const url = 'https://raw.githubusercontent.com/nishchith-m10/cold-email-dashboard/main/package-lock.json';

console.log('Fetching package-lock.json from GitHub main branch...');

try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const content = await response.text();
  writeFileSync('/vercel/share/v0-project/package-lock.json', content, 'utf-8');
  console.log(`Successfully wrote package-lock.json (${content.length} bytes)`);
} catch (e) {
  console.error('Error fetching lock file:', e.message);
}
