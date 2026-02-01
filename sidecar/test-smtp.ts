/**
 * SMTP SERVICE TEST SCRIPT
 * Tests the /send and /check-reply endpoints
 * 
 * Usage:
 *   ts-node test-smtp.ts
 */

import axios from 'axios';

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://127.0.0.1:3847';
const TEST_RECIPIENT = process.env.TEST_EMAIL || 'test@example.com';

async function testSend() {
  console.log('\n🧪 Testing POST /send endpoint...');
  
  try {
    const response = await axios.post(`${SIDECAR_URL}/send`, {
      to: TEST_RECIPIENT,
      subject: 'Test Email from Sidecar SMTP Service',
      htmlBody: '<p>This is a test email sent via the Sidecar SMTP service.</p><p>If you receive this, the <code>/send</code> endpoint is working correctly.</p>',
    });

    console.log('✅ /send response:', response.data);
    
    if (response.data.success && response.data.messageId) {
      console.log(`   Message ID: ${response.data.messageId}`);
      return response.data.messageId;
    } else {
      console.error('❌ Send failed:', response.data.error);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ /send error:', error.response?.data || error.message);
    } else {
      console.error('❌ /send error:', error);
    }
    return null;
  }
}

async function testCheckReply(messageId: string) {
  console.log('\n🧪 Testing GET /check-reply endpoint...');
  
  try {
    const response = await axios.get(`${SIDECAR_URL}/check-reply`, {
      params: {
        email: TEST_RECIPIENT,
        message_id: messageId,
      },
    });

    console.log('✅ /check-reply response:', response.data);
    
    if (response.data.replied) {
      console.log(`   ✉️  Reply detected! Count: ${response.data.replyCount}`);
    } else {
      console.log('   📭 No reply yet (this is expected for a just-sent email)');
    }
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ /check-reply error:', error.response?.data || error.message);
    } else {
      console.error('❌ /check-reply error:', error);
    }
    return null;
  }
}

async function testSendWithThreading() {
  console.log('\n🧪 Testing POST /send with threading (Email 2/3 scenario)...');
  
  try {
    // First, send Email 1
    const email1Response = await axios.post(`${SIDECAR_URL}/send`, {
      to: TEST_RECIPIENT,
      subject: 'Email 1: Initial Outreach',
      htmlBody: '<p>This is Email 1 in a sequence.</p>',
    });

    if (!email1Response.data.success) {
      console.error('❌ Email 1 failed:', email1Response.data.error);
      return;
    }

    const originalMessageId = email1Response.data.messageId;
    console.log(`✅ Email 1 sent, Message ID: ${originalMessageId}`);
    
    // Wait 2 seconds
    console.log('   ⏳ Waiting 2 seconds before sending Email 2...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send Email 2 with threading
    const email2Response = await axios.post(`${SIDECAR_URL}/send`, {
      to: TEST_RECIPIENT,
      subject: 'Re: Email 1: Initial Outreach',
      htmlBody: '<p>This is Email 2, following up on Email 1.</p><p>It includes threading headers (In-Reply-To and References).</p>',
      inReplyTo: originalMessageId,
      references: originalMessageId,
    });

    if (email2Response.data.success) {
      console.log(`✅ Email 2 sent with threading, Message ID: ${email2Response.data.messageId}`);
      console.log('   📧 Email client should display these as a conversation thread');
    } else {
      console.error('❌ Email 2 failed:', email2Response.data.error);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Threading test error:', error.response?.data || error.message);
    } else {
      console.error('❌ Threading test error:', error);
    }
  }
}

async function testHealth() {
  console.log('\n🧪 Testing GET /health endpoint...');
  
  try {
    const response = await axios.get(`${SIDECAR_URL}/health`);
    console.log('✅ /health response:', response.data);
    
    if (response.data.smtp_enabled) {
      console.log('   ✅ SMTP service is enabled');
    } else {
      console.log('   ⚠️  SMTP service is NOT enabled (check SMTP_* env vars)');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ /health error:', error.response?.data || error.message);
    } else {
      console.error('❌ /health error:', error);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SIDECAR SMTP SERVICE - TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Sidecar URL: ${SIDECAR_URL}`);
  console.log(`  Test Recipient: ${TEST_RECIPIENT}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Test 1: Health check
  await testHealth();

  // Test 2: Simple send (Email 1 scenario)
  const messageId = await testSend();

  // Test 3: Check reply (should be no reply)
  if (messageId) {
    await testCheckReply(messageId);
  }

  // Test 4: Threading support (Email 2/3 scenario)
  await testSendWithThreading();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUITE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n💡 Next Steps:');
  console.log('   1. Check your email inbox for test messages');
  console.log('   2. Verify threading works in your email client');
  console.log('   3. Reply to Email 1, then re-run test to verify /check-reply');
  console.log('\n📚 Documentation: See sidecar/README.md for API reference');
}

main().catch(console.error);
