#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const N8N_API_URL = 'https://64.23.139.93.sslip.io';
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNzA0MmFlMS01NWM0LTQ0YTctYTBiMi0yZGFlNTIxMzVmODgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5ODQ2NzM2LCJleHAiOjE3Nzc2MDgwMDB9.BAYZEAa5ztq38sH0akiargTRLDTa4_un5tohsNEKpsI';

async function makeN8nRequest(endpoint, method, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      rejectUnauthorized: false // For self-signed certs
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function duplicateWorkflow(sourceFile, newName) {
  console.log(`\n📋 Duplicating: ${path.basename(sourceFile)} -> ${newName}`);
  
  // Read source workflow
  const sourceWorkflow = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  
  // Prepare duplicate (only essential fields)
  const duplicate = {
    name: newName,
    nodes: sourceWorkflow.nodes,
    connections: sourceWorkflow.connections,
    settings: sourceWorkflow.settings
  };
  
  console.log(`   📊 Source: ${sourceWorkflow.nodes.length} nodes, ${Object.keys(sourceWorkflow.connections || {}).length} connections`);
  
  // Create workflow in n8n
  try {
    const response = await makeN8nRequest('/api/v1/workflows', 'POST', duplicate);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`   ✅ Created: ${response.data.name} (ID: ${response.data.id})`);
      console.log(`   📊 Result: ${response.data.nodes?.length || 0} nodes`);
      return response.data;
    } else {
      console.log(`   ❌ Failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 N8N Workflow Duplicator for Phase 64.B\n');
  
  const baseDir = path.join(__dirname, '..', 'base-cold-email');
  
  const workflows = [
    { file: 'Email 1.json', newName: 'Email 1 - Phase64B' },
    { file: 'Email 2.json', newName: 'Email 2 - Phase64B' },
    { file: 'Email 3.json', newName: 'Email 3 - Phase64B' }
  ];
  
  const results = [];
  
  for (const wf of workflows) {
    const sourceFile = path.join(baseDir, wf.file);
    const result = await duplicateWorkflow(sourceFile, wf.newName);
    results.push({ ...wf, result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  console.log('─'.repeat(60));
  results.forEach(r => {
    const status = r.result ? `✅ ${r.result.id}` : '❌ Failed';
    console.log(`${r.newName.padEnd(30)} ${status}`);
  });
  console.log('─'.repeat(60));
  
  // Output workflow IDs as JSON for easy parsing
  const successfulDuplicates = results
    .filter(r => r.result)
    .map(r => ({ name: r.newName, id: r.result.id, nodeCount: r.result.nodes?.length || 0 }));
  
  if (successfulDuplicates.length > 0) {
    console.log('\n📝 Workflow IDs (JSON):');
    console.log(JSON.stringify(successfulDuplicates, null, 2));
  }
}

main().catch(console.error);
