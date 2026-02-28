/**
 * Replace hardcoded pitch text in Email Preparation templates.
 * 
 * The "Analyze" node has hardcoded:
 * - Company description: "an AI automation agency that helps real estate teams..."
 * - Services list: AI Receptionist, CRM Automation, Website Chatbots, Social Media Automation
 * - "California Leads - Real Estate - Scraper City" cached result name
 * 
 * These should use YOUR_* placeholders so they're replaced during deployment.
 */

const fs = require('fs');
const path = require('path');

const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';

const replacements = [
  // Replace hardcoded company description in Analyze node
  {
    from: 'an AI automation agency that helps real estate teams capture more leads',
    to: 'YOUR_COMPANY_DESCRIPTION'
  },
  // Replace hardcoded services block in Analyze node
  {
    from: 'YOUR_COMPANY_NAME offers the following services:\\n- AI Receptionist: Answers calls 24/7, qualifies leads, books appointments directly into calendars\\n- CRM Automation: Automates follow-ups, lead nurturing, and pipeline management\\n- Website Chatbots: Captures and qualifies website visitors in real-time\\n- Social Media Automation: Responds to inquiries on Facebook, Instagram, WhatsApp instantly',
    to: 'YOUR_COMPANY_NAME offers the following services:\\nYOUR_SERVICES_LIST'
  },
  // Replace in draft node too
  {
    from: 'which is an AI Automation Agency offering AI Receptionists, full CRM automation, website chatbots, and social media handling across Facebook, Instagram, and WhatsApp.',
    to: 'YOUR_COMPANY_DESCRIPTION.'
  },
  // Replace cached Google Sheet name
  {
    from: 'California Leads - Real Estate - Scraper City',
    to: 'YOUR_LEADS_SHEET_NAME'
  },
];

const dirs = ['base-cold-email', 'cold-email-system'];
let totalChanges = 0;

for (const dir of dirs) {
  const dirPath = path.join(root, dir);
  if (fs.existsSync(dirPath) === false) continue;
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filepath = path.join(dirPath, file);
    let content = fs.readFileSync(filepath, 'utf-8');
    let fileChanges = 0;
    
    for (const rep of replacements) {
      if (content.includes(rep.from)) {
        const count = content.split(rep.from).length - 1;
        content = content.split(rep.from).join(rep.to);
        fileChanges += count;
        console.log(`${dir}/${file}: Replaced "${rep.from.substring(0, 50)}..." (${count}x)`);
      }
    }
    
    if (fileChanges > 0) {
      fs.writeFileSync(filepath, content);
      totalChanges += fileChanges;
    }
  }
}

console.log(`\nTotal replacements: ${totalChanges}`);
