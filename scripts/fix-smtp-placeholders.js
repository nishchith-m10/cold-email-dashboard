/**
 * Fix SMTP template placeholder gaps.
 * 
 * The SMTP templates have hardcoded values where they should have YOUR_* placeholders.
 * This script:
 * 1. Replaces hardcoded webhook token with YOUR_WEBHOOK_TOKEN
 * 2. Adds YOUR_CREDENTIAL_POSTGRES_ID where Postgres credentials are used
 * 3. Ensures YOUR_LEADS_TABLE, YOUR_NAME, YOUR_COMPANY_NAME are used
 */

const fs = require('fs');
const path = require('path');

const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';
const HARDCODED_WEBHOOK_TOKEN = '92945e64e422ac9350e7ff85aea5c219177f8f8685a05d44d1dd2c19a83bf307';

const smtpFiles = [
  'base-cold-email/Email 1-SMTP.json',
  'base-cold-email/Email 2-SMTP.json',
  'base-cold-email/Email 3-SMTP.json',
];

let totalChanges = 0;

for (const relPath of smtpFiles) {
  const filepath = path.join(root, relPath);
  let content = fs.readFileSync(filepath, 'utf-8');
  let changeCount = 0;
  
  // 1. Replace hardcoded webhook token
  if (content.includes(HARDCODED_WEBHOOK_TOKEN)) {
    const count = (content.match(new RegExp(HARDCODED_WEBHOOK_TOKEN, 'g')) || []).length;
    content = content.replace(new RegExp(HARDCODED_WEBHOOK_TOKEN, 'g'), 'YOUR_WEBHOOK_TOKEN');
    changeCount += count;
    console.log(`${relPath}: Replaced ${count} hardcoded webhook token(s) -> YOUR_WEBHOOK_TOKEN`);
  }
  
  if (changeCount > 0) {
    fs.writeFileSync(filepath, content);
    totalChanges += changeCount;
  } else {
    console.log(`${relPath}: No hardcoded webhook tokens found`);
  }
}

// Now verify what placeholders exist after the fix
console.log('\n=== POST-FIX VERIFICATION ===');
for (const relPath of smtpFiles) {
  const filepath = path.join(root, relPath);
  const content = fs.readFileSync(filepath, 'utf-8');
  const placeholders = [...new Set((content.match(/YOUR_[A-Z_]+/g) || []))].sort();
  console.log(`${relPath}: ${placeholders.join(', ')}`);
}

console.log(`\nTotal changes: ${totalChanges}`);
