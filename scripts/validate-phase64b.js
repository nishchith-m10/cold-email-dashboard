const fs = require('fs');
const path = require('path');

async function validate() {
  const baseDir = path.join(__dirname, '..', 'base-cold-email');
  
  const working = JSON.parse(fs.readFileSync(path.join(baseDir, 'Email 1.json'), 'utf-8'));
  const broken = JSON.parse(fs.readFileSync(path.join(baseDir, 'Email 1 - Phase64B.json'), 'utf-8'));
  
  const workingNodeNames = working.nodes.map(n => n.name);
  const brokenNodeNames = broken.nodes.map(n => n.name);
  const newNodes = broken.nodes.filter(n => !workingNodeNames.includes(n.name));
  
  console.log(`New nodes: ${newNodes.length}`);
  console.log(`  ${newNodes.map(n => n.name).join(', ')}`);
  
  // Check httpRequest node structures
  const httpNodes = newNodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
  console.log(`\nHTTP nodes: ${httpNodes.length}`);
  
  for (const node of httpNodes) {
    const requiredFields = ['url', 'method'];
    const hasRequired = requiredFields.every(f => node.parameters && node.parameters[f]);
    console.log(`  ${node.name}: ${hasRequired ? '✓' : '✗'} has required fields`);
    
    // Check against working HTTP nodes
    const workingHttpNodes = working.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    if (workingHttpNodes.length > 0) {
      const workingStructure = Object.keys(workingHttpNodes[0].parameters || {}).sort();
      const brokenStructure = Object.keys(node.parameters || {}).sort();
      const missing = workingStructure.filter(k => !brokenStructure.includes(k));
      if (missing.length > 0) {
        console.log(`    Missing fields: ${missing.join(', ')}`);
      }
    }
  }
  
  // Check Switch node structure
  const switchNode = broken.nodes.find(n => n.type === 'n8n-nodes-base.switch' && n.name === 'Email Provider Switch');
  if (switchNode) {
    console.log(`\nSwitch node: ${switchNode.name} (v${switchNode.typeVersion})`);
    if (switchNode.parameters?.rules) {
      const hasValues = 'values' in switchNode.parameters.rules;
      const hasRules = 'rules' in switchNode.parameters.rules;
      console.log(`  Structure: ${hasValues ? '✓ uses "values"' : '✗ missing "values"'}`);
      if (hasRules && !hasValues) {
        console.log(`  WARNING: Uses "rules" instead of "values"`);
      }
    }
  }
  
  // Check for missing required fields
  console.log(`\nField validation:`);
  for (const node of newNodes) {
    const hasOnError = 'onError' in node;
    console.log(`  ${node.name}: ${hasOnError ? '✓' : '✗'} has onError field`);
    
    const workingSameType = working.nodes.find(n => n.type === node.type);
    if (workingSameType) {
      const workingKeys = Object.keys(workingSameType).sort();
      const brokenKeys = Object.keys(node).sort();
      const missing = workingKeys.filter(k => !brokenKeys.includes(k));
      if (missing.length > 0) {
        console.log(`    Missing: ${missing.join(', ')}`);
      }
    }
  }
  
  // Check connections structure
  const newNodeNames = newNodes.map(n => n.name);
  const affectedConnections = {};
  
  for (const [sourceName, connData] of Object.entries(broken.connections)) {
    if (newNodeNames.includes(sourceName) || 
        (connData.main && connData.main.some(outputs => outputs.some(c => newNodeNames.includes(c.node))))) {
      affectedConnections[sourceName] = connData;
    }
  }
  
  console.log(`\nConnections: ${Object.keys(affectedConnections).length} affected`);
  
  // Check if any connection has malformed structure
  let malformedCount = 0;
  for (const [sourceName, connData] of Object.entries(affectedConnections)) {
    if (!connData.main || !Array.isArray(connData.main)) {
      console.log(`  ✗ Malformed: ${sourceName} (missing main array)`);
      malformedCount++;
    } else {
      for (let i = 0; i < connData.main.length; i++) {
        const outputs = connData.main[i];
        if (!Array.isArray(outputs)) {
          console.log(`  ✗ Malformed: ${sourceName}[${i}] (output not array)`);
          malformedCount++;
        } else {
          for (const conn of outputs) {
            if (!conn.node || !('type' in conn) || !('index' in conn)) {
              console.log(`  ✗ Malformed: ${sourceName}[${i}] -> ${conn.node || 'unknown'}`);
              malformedCount++;
            }
          }
        }
      }
    }
  }
  if (malformedCount === 0) {
    console.log(`  ✓ All connections valid`);
  }
  
  // Check for position/ID collisions
  const nodeIds = broken.nodes.map(n => n.id);
  const duplicateIds = nodeIds.filter((id, i) => nodeIds.indexOf(id) !== i);
  
  console.log(`\nNode IDs: ${duplicateIds.length > 0 ? '✗' : '✓'} ${duplicateIds.length > 0 ? `${duplicateIds.length} duplicates` : 'all unique'}`);
  
  console.log('\n✓ Validation complete');
}

validate();
