const fs = require('fs');
const path = require('path');

const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';
const dirs = ['base-cold-email', 'cold-email-system'];

const replacements = [
  ['a real estate professional', 'a prospect'],
  ['real estate teams', 'YOUR_TARGET_INDUSTRY'],
];

let totalChanges = 0;

for (const dir of dirs) {
  const dirPath = path.join(root, dir);
  if (fs.existsSync(dirPath) === false) continue;
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filepath = path.join(dirPath, file);
    let content = fs.readFileSync(filepath, 'utf-8');
    let fileChanges = 0;
    
    for (const [from, to] of replacements) {
      if (content.includes(from)) {
        const count = content.split(from).length - 1;
        content = content.split(from).join(to);
        fileChanges += count;
        console.log(`${dir}/${file}: "${from}" -> "${to}" (${count}x)`);
      }
    }
    
    if (fileChanges > 0) {
      fs.writeFileSync(filepath, content);
      totalChanges += fileChanges;
    }
  }
}

console.log(`\nTotal: ${totalChanges}`);

// Verify
for (const dir of dirs) {
  const epFile = path.join(root, dir, 'Email Preparation.json');
  if (fs.existsSync(epFile) === false) continue;
  const content = fs.readFileSync(epFile, 'utf-8');
  console.log(`${dir}: Contains "real estate"? ${content.includes('real estate')}`);
}
