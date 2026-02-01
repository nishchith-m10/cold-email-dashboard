#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'base-cold-email');
const originalFile = path.join(baseDir, 'Email 1.json');
const outputFile = path.join(baseDir, 'Email 1 - Phase64B.json');

// Read original workflow
const workflow = JSON.parse(fs.readFileSync(originalFile, 'utf8'));

console.log(`📖 Read original: ${workflow.name} (${workflow.nodes.length} nodes)`);

// Change name
workflow.name = "Email 1 - Phase64B";

// Find key nodes
const injectNode = workflow.nodes.find(n => n.name === "Inject Tracking");
const gmailNode = workflow.nodes.find(n => n.name === "Gmail");
const trackNode = workflow.nodes.find(n => n.name === "Track Email Sent");
const selectNode = workflow.nodes.find(n => n.name === "Select rows for Email 1");

if (!injectNode || !gmailNode || !trackNode) {
  console.error('❌ Could not find required nodes');
  process.exit(1);
}

console.log(`✅ Found Inject Tracking at [${injectNode.position}]`);
console.log(`✅ Found Gmail at [${gmailNode.position}]`);
console.log(`✅ Found Track Email Sent at [${trackNode.position}]`);

// Generate unique IDs
const newIds = {
  fetchConfig: `fetch-config-${Date.now()}`,
  switch: `provider-switch-${Date.now() + 1}`,
  sendgrid: `sendgrid-${Date.now() + 2}`,
  mailgun: `mailgun-${Date.now() + 3}`,
  ses: `ses-${Date.now() + 4}`,
  postmark: `postmark-${Date.now() + 5}`
};

// 1. Add Fetch Email Provider Config node
workflow.nodes.push({
  "id": newIds.fetchConfig,
  "name": "Fetch Email Provider Config",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [injectNode.position[0] + 116, injectNode.position[1]],
  "parameters": {
    "url": "YOUR_DASHBOARD_URL/api/workspace/email-config",
    "method": "GET",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "x-workspace-id",
          "value": "={{ $('Select rows for Email 1').item.json.workspace_id || 'default' }}"
        }
      ]
    },
    "options": {
      "response": {
        "response": {
          "responseFormat": "json"
        }
      }
    }
  }
});

// 2. Add Email Provider Switch node
workflow.nodes.push({
  "id": newIds.switch,
  "name": "Email Provider Switch",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "position": [injectNode.position[0] + 216, injectNode.position[1]],
  "parameters": {
    "rules": {
      "rules": [
        {
          "output": 0,
          "value1": "={{ $('Fetch Email Provider Config').json.provider }}",
          "value2": "gmail",
          "operation": "equal",
          "conditions": {
            "options": {
              "version": 2,
              "leftValue": "",
              "caseSensitive": true,
              "typeValidation": "strict"
            }
          }
        },
        {
          "output": 1,
          "value1": "={{ $('Fetch Email Provider Config').json.provider }}",
          "value2": "sendgrid",
          "operation": "equal",
          "conditions": {
            "options": {
              "version": 2,
              "leftValue": "",
              "caseSensitive": true,
              "typeValidation": "strict"
            }
          }
        },
        {
          "output": 2,
          "value1": "={{ $('Fetch Email Provider Config').json.provider }}",
          "value2": "mailgun",
          "operation": "equal",
          "conditions": {
            "options": {
              "version": 2,
              "leftValue": "",
              "caseSensitive": true,
              "typeValidation": "strict"
            }
          }
        },
        {
          "output": 3,
          "value1": "={{ $('Fetch Email Provider Config').json.provider }}",
          "value2": "ses",
          "operation": "equal",
          "conditions": {
            "options": {
              "version": 2,
              "leftValue": "",
              "caseSensitive": true,
              "typeValidation": "strict"
            }
          }
        },
        {
          "output": 4,
          "value1": "={{ $('Fetch Email Provider Config').json.provider }}",
          "value2": "postmark",
          "operation": "equal",
          "conditions": {
            "options": {
              "version": 2,
              "leftValue": "",
              "caseSensitive": true,
              "typeValidation": "strict"
            }
          }
        }
      ]
    },
    "options": {}
  }
});

// 3. Add SendGrid Send node
workflow.nodes.push({
  "id": newIds.sendgrid,
  "name": "SendGrid Send",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [gmailNode.position[0], gmailNode.position[1] + 100],
  "parameters": {
    "url": "https://api.sendgrid.com/v3/mail/send",
    "method": "POST",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "=Bearer {{ $('Fetch Email Provider Config').json.sendgrid_api_key }}"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\\n  \\\"personalizations\\\": [{\\n    \\\"to\\\": [{\\n      \\\"email\\\": \\\"{{ $('Select rows for Email 1').item.json.email_address }}\\\"\\n    }]\\n  }],\\n  \\\"from\\\": {\\n    \\\"email\\\": \\\"{{ $('Fetch Email Provider Config').json.sendgrid_from_email }}\\\",\\n    \\\"name\\\": \\\"{{ $('Fetch Email Provider Config').json.sendgrid_from_name }}\\\"\\n  },\\n  \\\"subject\\\": \\\"{{ $('Select rows for Email 1').item.json.email_1_subject }}\\\",\\n  \\\"content\\\": [{\\n    \\\"type\\\": \\\"text/html\\\",\\n    \\\"value\\\": \\\"{{ $('Inject Tracking').json.tracked_body }}\\\"\\n  }]\\n}",
    "options": {}
  }
});

// 4. Add Mailgun Send node
workflow.nodes.push({
  "id": newIds.mailgun,
  "name": "Mailgun Send",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [gmailNode.position[0], gmailNode.position[1] + 200],
  "parameters": {
    "url": "=https://api.mailgun.net/v3/{{ $('Fetch Email Provider Config').json.mailgun_domain }}/messages",
    "method": "POST",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "=Basic {{ Buffer.from('api:' + $('Fetch Email Provider Config').json.mailgun_api_key).toString('base64') }}"
        }
      ]
    },
    "sendBody": true,
    "contentType": "form-urlencoded",
    "bodyParameters": {
      "parameters": [
        {
          "name": "from",
          "value": "={{ $('Fetch Email Provider Config').json.mailgun_from_name }} <{{ $('Fetch Email Provider Config').json.mailgun_from_email }}>"
        },
        {
          "name": "to",
          "value": "={{ $('Select rows for Email 1').item.json.email_address }}"
        },
        {
          "name": "subject",
          "value": "={{ $('Select rows for Email 1').item.json.email_1_subject }}"
        },
        {
          "name": "html",
          "value": "={{ $('Inject Tracking').json.tracked_body }}"
        }
      ]
    },
    "options": {}
  }
});

// 5. Add AWS SES Send node
workflow.nodes.push({
  "id": newIds.ses,
  "name": "AWS SES Send",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [gmailNode.position[0], gmailNode.position[1] + 300],
  "parameters": {
    "url": "=https://email.{{ $('Fetch Email Provider Config').json.ses_region }}.amazonaws.com/",
    "method": "POST",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/x-www-form-urlencoded"
        }
      ]
    },
    "sendBody": true,
    "contentType": "form-urlencoded",
    "bodyParameters": {
      "parameters": [
        {
          "name": "Action",
          "value": "SendEmail"
        },
        {
          "name": "Source",
          "value": "={{ $('Fetch Email Provider Config').json.ses_from_email }}"
        },
        {
          "name": "Destination.ToAddresses.member.1",
          "value": "={{ $('Select rows for Email 1').item.json.email_address }}"
        },
        {
          "name": "Message.Subject.Data",
          "value": "={{ $('Select rows for Email 1').item.json.email_1_subject }}"
        },
        {
          "name": "Message.Body.Html.Data",
          "value": "={{ $('Inject Tracking').json.tracked_body }}"
        }
      ]
    },
    "options": {}
  }
});

// 6. Add Postmark Send node
workflow.nodes.push({
  "id": newIds.postmark,
  "name": "Postmark Send",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [gmailNode.position[0], gmailNode.position[1] + 400],
  "parameters": {
    "url": "https://api.postmarkapp.com/email",
    "method": "POST",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "X-Postmark-Server-Token",
          "value": "={{ $('Fetch Email Provider Config').json.postmark_server_token }}"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\\n  \\\"From\\\": \\\"{{ $('Fetch Email Provider Config').json.postmark_from_email }}\\\",\\n  \\\"To\\\": \\\"{{ $('Select rows for Email 1').item.json.email_address }}\\\",\\n  \\\"Subject\\\": \\\"{{ $('Select rows for Email 1').item.json.email_1_subject }}\\\",\\n  \\\"HtmlBody\\\": \\\"{{ $('Inject Tracking').json.tracked_body }}\\\"\\n}",
    "options": {}
  }
});

console.log(`✅ Added 6 new nodes`);

// Now update connections
// Original: Inject Tracking -> Gmail -> Track Email Sent
// New: Inject Tracking -> Fetch Config -> Switch -> [Gmail/SendGrid/Mailgun/SES/Postmark] -> Track Email Sent

// Update Inject Tracking connections (remove old Gmail connection, add Fetch Config)
workflow.connections["Inject Tracking"] = {
  "main": [[{
    "node": "Fetch Email Provider Config",
    "type": "main",
    "index": 0
  }]]
};

// Add Fetch Config connections
workflow.connections["Fetch Email Provider Config"] = {
  "main": [[{
    "node": "Email Provider Switch",
    "type": "main",
    "index": 0
  }]]
};

// Add Switch connections (5 outputs - one for each provider)
workflow.connections["Email Provider Switch"] = {
  "main": [
    [{  // Output 0: Gmail
      "node": "Gmail",
      "type": "main",
      "index": 0
    }],
    [{  // Output 1: SendGrid
      "node": "SendGrid Send",
      "type": "main",
      "index": 0
    }],
    [{  // Output 2: Mailgun
      "node": "Mailgun Send",
      "type": "main",
      "index": 0
    }],
    [{  // Output 3: SES
      "node": "AWS SES Send",
      "type": "main",
      "index": 0
    }],
    [{  // Output 4: Postmark
      "node": "Postmark Send",
      "type": "main",
      "index": 0
    }]
  ]
};

// Gmail already connects to Track Email Sent, keep that
// Add connections from new provider nodes to Track Email Sent
workflow.connections["SendGrid Send"] = {
  "main": [[{
    "node": "Track Email Sent",
    "type": "main",
    "index": 0
  }]]
};

workflow.connections["Mailgun Send"] = {
  "main": [[{
    "node": "Track Email Sent",
    "type": "main",
    "index": 0
  }]]
};

workflow.connections["AWS SES Send"] = {
  "main": [[{
    "node": "Track Email Sent",
    "type": "main",
    "index": 0
  }]]
};

workflow.connections["Postmark Send"] = {
  "main": [[{
    "node": "Track Email Sent",
    "type": "main",
    "index": 0
  }]]
};

console.log(`✅ Updated connections`);

// Update Track Email Sent to include provider tracking
const trackEmailNode = workflow.nodes.find(n => n.name === "Track Email Sent");
if (trackEmailNode) {
  trackEmailNode.parameters.jsonBody = "={\\n  \\\"contact_email\\\": \\\"{{ $('Select rows for Email 1').item.json.email_address }}\\\",\\n  \\\"campaign\\\": \\\"Ohio\\\",\\n  \\\"step\\\": 1,\\n  \\\"event_type\\\": \\\"sent\\\",\\n  \\\"provider\\\": \\\"{{ $('Fetch Email Provider Config').json.provider || 'gmail' }}\\\",\\n  \\\"provider_message_id\\\": \\\"{{ $json.id || $json.threadId || $json.MessageId || $json.messageId }}\\\",\\n  \\\"event_ts\\\": \\\"{{ new Date().toISOString() }}\\\",\\n  \\\"subject\\\": \\\"{{ $('Select rows for Email 1').item.json.email_1_subject }}\\\",\\n  \\\"body\\\": \\\"{{ $('Select rows for Email 1').item.json.email_1_body }}\\\",\\n  \\\"idempotency_key\\\": \\\"email_{{ $execution.id }}_{{ $('Select rows for Email 1').item.json.email_address }}_step1\\\",\\n  \\\"n8n_execution_id\\\": \\\"{{ $execution.id }}\\\"\\n}";
  console.log(`✅ Updated Track Email Sent with provider tracking`);
}

// Save
fs.writeFileSync(outputFile, JSON.stringify(workflow, null, 2));

console.log(`\n✅ Created: ${path.basename(outputFile)}`);
console.log(`📊 Total nodes: ${workflow.nodes.length} (was 14, added 6)`);
console.log(`📍 Location: ${outputFile}`);
console.log(`\n📝 Next steps:`);
console.log(`1. Open n8n: https://64.23.139.93.sslip.io`);
console.log(`2. Click "Import from File"`);
console.log(`3. Select: ${outputFile}`);
console.log(`4. Click "Import"`);
