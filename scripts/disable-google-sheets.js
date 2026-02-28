#!/usr/bin/env node
/**
 * Disable all Google Sheets nodes in n8n workflow templates.
 * Sets "disabled": true on every n8n-nodes-base.googleSheets node.
 * Also replaces hardcoded Google Sheet document IDs with YOUR_GOOGLE_SHEET_ID.
 */

const fs = require('fs');
const path = require('path');

const HARDCODED_SHEET_ID = '1bu356F6CrJ653Gy3DhetSZhBymXJUpAGucxJgreaze8';
const PLACEHOLDER_SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';

const dirs = ['base-cold-email', 'cold-email-system'];
let totalDisabled = 0;
let totalSheetIdReplaced = 0;

for (const dir of dirs) {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) continue;
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filepath = path.join(dirPath, file);
    let raw = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(raw);
    
    if (!data.nodes) continue;
    
    let modified = false;
    
    // Disable Google Sheets nodes
    for (const node of data.nodes) {
      if (node.type === 'n8n-nodes-base.googleSheets') {
        if (!node.disabled) {
          node.disabled = true;
          modified = true;
          totalDisabled++;
          console.log(`DISABLED: ${dir}/${file} -> "${node.name}"`);
        }
      }
    }
    
    // Replace hardcoded Sheet ID
    let jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.includes(HARDCODED_SHEET_ID)) {
      const count = (jsonStr.match(new RegExp(HARDCODED_SHEET_ID, 'g')) || []).length;
      jsonStr = jsonStr.replace(new RegExp(HARDCODED_SHEET_ID, 'g'), PLACEHOLDER_SHEET_ID);
      totalSheetIdReplaced += count;
      modified = true;
      console.log(`REPLACED: ${dir}/${file} -> ${count} hardcoded Sheet ID(s)`);
    }
    
    if (modified) {
      fs.writeFileSync(filepath, jsonStr + '\n');
    }
  }
}

console.log(`\nTotal Google Sheets nodes disabled: ${totalDisabled}`);
console.log(`Total hardcoded Sheet IDs replaced: ${totalSheetIdReplaced}`);
