const fs = require('fs');
const path = require('path');

const dirs = ['base-cold-email', 'cold-email-system'];
const root = '/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter';

for (const dir of dirs) {
  const dirPath = path.join(root, dir);
  if (!fs.existsSync(dirPath)) continue;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filepath = path.join(dirPath, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    if (!data.nodes) continue;
    data.nodes.filter(n => n.type === 'n8n-nodes-base.googleSheets').forEach(n => {
      console.log(`${dir}/${file} | ${n.name} | disabled: ${n.disabled}`);
    });
  }
}
