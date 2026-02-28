const fs = require('fs');
const path = require('path');
const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';

const pairs = [
  ['base-cold-email/Email 1.json', 'base-cold-email/Email 1-SMTP.json'],
  ['base-cold-email/Email 2.json', 'base-cold-email/Email 2-SMTP.json'],
  ['base-cold-email/Email 3.json', 'base-cold-email/Email 3-SMTP.json'],
];

for (const [gmail, smtp] of pairs) {
  const gmailStr = fs.readFileSync(path.join(root, gmail), 'utf-8');
  const smtpStr = fs.readFileSync(path.join(root, smtp), 'utf-8');
  
  const gmailPlaceholders = new Set((gmailStr.match(/YOUR_[A-Z_]+/g) || []));
  const smtpPlaceholders = new Set((smtpStr.match(/YOUR_[A-Z_]+/g) || []));
  
  const missing = [...gmailPlaceholders].filter(p => {
    return smtpPlaceholders.has(p) === false;
  });
  const extra = [...smtpPlaceholders].filter(p => {
    return gmailPlaceholders.has(p) === false;
  });
  
  console.log('=== ' + gmail.split('/')[1] + ' vs ' + smtp.split('/')[1] + ' ===');
  console.log('Gmail has:', [...gmailPlaceholders].sort().join(', '));
  console.log('SMTP has:', [...smtpPlaceholders].sort().join(', '));
  console.log('MISSING from SMTP:', missing.sort().join(', ') || 'NONE');
  console.log('EXTRA in SMTP:', extra.sort().join(', ') || 'NONE');
  console.log('');
}
