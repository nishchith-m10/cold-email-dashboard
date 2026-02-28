import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectDir = '/vercel/share/v0-project';
const lockPath = join(projectDir, 'package-lock.json');

console.log('Lock file exists:', existsSync(lockPath));

// Try to find it in .git
const gitDir = join(projectDir, '.git');
console.log('.git exists:', existsSync(gitDir));

// List files in project root
import { readdirSync } from 'node:fs';
const files = readdirSync(projectDir).filter(f => f.includes('lock') || f.includes('package'));
console.log('Package-related files:', files);
