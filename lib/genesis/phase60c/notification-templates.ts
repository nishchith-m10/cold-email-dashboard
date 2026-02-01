/**
 * GENESIS PART VI - PHASE 60.C: ADMIN NOTIFICATION SYSTEM
 * Notification templates for Gmail and Telegram
 */

import {
  ClientFirstLoginPayload,
  DropletReadyPayload,
  HighRiskSignupPayload,
  NewCampaignPayload,
  IgnitionFailedPayload,
  SetupNotReviewedPayload,
} from './notification-types';

/**
 * Template interface
 */
export interface NotificationTemplate {
  subject?: string; // For Gmail
  body: string;
}

/**
 * Gmail Templates
 */
export class GmailTemplates {
  static clientFirstLogin(payload: ClientFirstLoginPayload): NotificationTemplate {
    return {
      subject: `🎉 New Client Login: ${payload.workspace_name}`,
      body: `Hi,

A new client has logged into their workspace for the first time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client: ${payload.workspace_name}
User Email: ${payload.user_email}${payload.user_name ? `\nUser Name: ${payload.user_name}` : ''}
Login Time: ${payload.timestamp.toISOString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is their first session. They may need guidance on next steps.
`,
    };
  }

  static dropletReady(payload: DropletReadyPayload): NotificationTemplate {
    return {
      subject: `🚀 New Client Ready for Setup: ${payload.workspace_name}`,
      body: `Hi,

A new client's engine has been provisioned and is ready for setup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client: ${payload.workspace_name}
User Email: ${payload.user_email}
Provisioned: ${payload.timestamp.toISOString()}

n8n URL: ${payload.n8n_url}

Owner Account Credentials (for first-time setup):
Email: ${payload.n8n_owner_email}
Password: ${payload.n8n_owner_password}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
1. Navigate to n8n URL (if first time, create owner account using credentials above)
2. Import 7 workflow templates
3. Customize prompts for client's brand
4. Verify credentials work
5. Import leads (if available)
6. Run production test
7. Mark setup complete in dashboard

Dashboard: ${payload.admin_dashboard_url}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    };
  }

  static highRiskSignup(payload: HighRiskSignupPayload): NotificationTemplate {
    const signalsText = payload.signals.map(s => `  • ${s}`).join('\n');
    
    return {
      subject: `⚠️ High-Risk Signup Detected: ${payload.workspace_name}`,
      body: `Hi,

A high-risk signup has been detected and is pending manual review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspace: ${payload.workspace_name}
User Email: ${payload.user_email}
Risk Score: ${payload.risk_score}/100
Risk Level: ${payload.risk_level.toUpperCase()}

Detected Signals:
${signalsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Review this signup: ${payload.review_url}

Actions:
• Approve: User can proceed with ignition
• Reject: Notify user account cannot be verified
• Monitor: Allow ignition but flag for enhanced monitoring

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    };
  }

  static newCampaign(payload: NewCampaignPayload): NotificationTemplate {
    return {
      subject: `📢 New Campaign Created: ${payload.campaign_name}`,
      body: `Hi,

A new campaign has been created and ${payload.needs_setup ? 'needs workflow setup' : 'is ready'}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspace: ${payload.workspace_name}
Campaign: ${payload.campaign_name}
Campaign ID: ${payload.campaign_id}
Created: ${payload.timestamp.toISOString()}

${payload.needs_setup ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setup Required:
1. Clone workflows for this campaign
2. Customize prompts
3. Activate campaign

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ''}
`,
    };
  }

  static ignitionFailed(payload: IgnitionFailedPayload): NotificationTemplate {
    return {
      subject: `❌ Ignition Failed (${payload.retry_count} retries): ${payload.workspace_name}`,
      body: `Hi,

Droplet ignition has failed after ${payload.retry_count} retry attempts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspace: ${payload.workspace_name}
Workspace ID: ${payload.workspace_id}
Failed At: ${payload.failed_at.toISOString()}
Retry Count: ${payload.retry_count}

Error:
${payload.error_message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANUAL INTERVENTION REQUIRED

Possible causes:
• DigitalOcean API quota exceeded
• Network connectivity issues
• Invalid cloud-init script
• Insufficient account balance

User has been notified:
"We're experiencing technical difficulties. Our team has been notified 
and will resolve this shortly."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    };
  }

  static setupNotReviewed(payload: SetupNotReviewedPayload): NotificationTemplate {
    return {
      subject: `⚠️ OVERDUE: ${payload.pending_count} workspace${payload.pending_count > 1 ? 's' : ''} awaiting setup for ${payload.hours_pending}+ hours`,
      body: `Hi,

ESCALATION: Multiple workspaces are pending admin setup and have exceeded the 24-hour threshold.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Pending: ${payload.pending_count} workspace${payload.pending_count > 1 ? 's' : ''}
Oldest Item: ${payload.oldest_workspace_name}
Hours Pending: ${payload.hours_pending}h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMMEDIATE ACTION REQUIRED

These clients are waiting for:
• Workflow imports
• Prompt customization
• Credential verification
• Lead imports

This notification will repeat every 12 hours until resolved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    };
  }
}

/**
 * Telegram Templates
 */
export class TelegramTemplates {
  static clientFirstLogin(payload: ClientFirstLoginPayload): NotificationTemplate {
    return {
      body: `🎉 *NEW CLIENT LOGIN*

Workspace: ${payload.workspace_name}
User: ${payload.user_email}
Time: ${payload.timestamp.toISOString()}`,
    };
  }

  static dropletReady(payload: DropletReadyPayload): NotificationTemplate {
    return {
      body: `🚀 *NEW CLIENT READY*

Workspace: ${payload.workspace_name}
n8n: ${payload.n8n_url}

[Open Dashboard](${payload.admin_dashboard_url})`,
    };
  }

  static highRiskSignup(payload: HighRiskSignupPayload): NotificationTemplate {
    return {
      body: `⚠️ *HIGH-RISK SIGNUP*

Workspace: ${payload.workspace_name}
Risk: ${payload.risk_score}/100 (${payload.risk_level.toUpperCase()})

[Review Now](${payload.review_url})`,
    };
  }

  static newCampaign(payload: NewCampaignPayload): NotificationTemplate {
    return {
      body: `📢 *NEW CAMPAIGN*

Workspace: ${payload.workspace_name}
Campaign: ${payload.campaign_name}
${payload.needs_setup ? '\n⚠️ Setup required' : '✅ Ready'}`,
    };
  }

  static ignitionFailed(payload: IgnitionFailedPayload): NotificationTemplate {
    return {
      body: `❌ *IGNITION FAILED*

Workspace: ${payload.workspace_name}
Retries: ${payload.retry_count}

Error: ${payload.error_message.substring(0, 100)}${payload.error_message.length > 100 ? '...' : ''}

⚠️ MANUAL INTERVENTION REQUIRED`,
    };
  }

  static setupNotReviewed(payload: SetupNotReviewedPayload): NotificationTemplate {
    return {
      body: `⚠️ *ESCALATION: SETUP OVERDUE*

${payload.pending_count} workspace${payload.pending_count > 1 ? 's' : ''} pending ${payload.hours_pending}h+
Oldest: ${payload.oldest_workspace_name}

🚨 IMMEDIATE ACTION REQUIRED`,
    };
  }
}
