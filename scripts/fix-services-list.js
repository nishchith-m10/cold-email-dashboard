/**
 * Fix remaining hardcoded services list in Email Preparation templates.
 * The services list exists inside escaped JSON strings.
 */

const fs = require('fs');
const path = require('path');

const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';

const dirs = ['base-cold-email', 'cold-email-system'];
let totalChanges = 0;

// The service descriptions to replace
const serviceBlock = '- AI Receptionist: Answers calls 24/7, qualifies leads, books appointments directly into calendars';
const serviceBlock2 = '- CRM Automation: Automates follow-ups, lead nurturing, and pipeline management';
const serviceBlock3 = '- Website Chatbots: Captures and qualifies website visitors in real-time';
const serviceBlock4 = '- Social Media Automation: Responds to inquiries on Facebook, Instagram, WhatsApp instantly';

for (const dir of dirs) {
  const dirPath = path.join(root, dir);
  if (fs.existsSync(dirPath) === false) continue;
  
  const epFile = path.join(dirPath, 'Email Preparation.json');
  if (fs.existsSync(epFile) === false) continue;
  
  let content = fs.readFileSync(epFile, 'utf-8');
  
  // Replace service descriptions with a placeholder
  const replacements = [
    [serviceBlock, 'YOUR_SERVICE_1_DESCRIPTION'],
    [serviceBlock2, 'YOUR_SERVICE_2_DESCRIPTION'],
    [serviceBlock3, 'YOUR_SERVICE_3_DESCRIPTION'],
    [serviceBlock4, 'YOUR_SERVICE_4_DESCRIPTION'],
  ];
  
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      totalChanges++;
      console.log(`${dir}/Email Preparation.json: Replaced "${from.substring(0, 40)}..." -> ${to}`);
    }
  }
  
  fs.writeFileSync(epFile, content);
}

console.log(`\nTotal changes: ${totalChanges}`);

// Verify
for (const dir of dirs) {
  const epFile = path.join(root, dir, 'Email Preparation.json');
  if (fs.existsSync(epFile) === false) continue;
  const content = fs.readFileSync(epFile, 'utf-8');
  console.log(`${dir}: Still contains "AI Receptionist"? ${content.includes('AI Receptionist')}`);
  console.log(`${dir}: Still contains "real estate"? ${content.includes('real estate')}`);
}
