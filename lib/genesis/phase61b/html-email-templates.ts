/**
 * GENESIS PHASE 61B: HTML EMAIL TEMPLATES
 * 
 * Professional HTML email templates for admin notification system.
 * All templates are responsive, accessible, and follow email best practices.
 * 
 * Features:
 * - Mobile-responsive design
 * - Proper semantic HTML
 * - Inline CSS for email client compatibility
 * - Plain text fallback included
 * - Brand colors and consistent styling
 * - Accessible with proper alt text
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
 * Brand colors
 */
const COLORS = {
  primary: '#3b82f6',      // Blue
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
} as const;

/**
 * Email template wrapper with header and footer
 */
function wrapWithLayout(content: string, title: string, icon: string = '📧'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${COLORS.gray700};
      background-color: ${COLORS.gray100};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${COLORS.white};
    }
    .email-header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, #2563eb 100%);
      padding: 32px 24px;
      text-align: center;
      color: ${COLORS.white};
    }
    .email-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .email-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: ${COLORS.white};
    }
    .email-body {
      padding: 32px 24px;
    }
    .info-section {
      background-color: ${COLORS.gray100};
      border-left: 4px solid ${COLORS.primary};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 8px 0;
    }
    .info-label {
      font-weight: 600;
      color: ${COLORS.gray900};
      display: inline-block;
      min-width: 140px;
    }
    .info-value {
      color: ${COLORS.gray700};
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${COLORS.primary};
      color: ${COLORS.white};
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 8px 16px 0;
    }
    .button-success {
      background-color: ${COLORS.success};
    }
    .button-warning {
      background-color: ${COLORS.warning};
    }
    .button-danger {
      background-color: ${COLORS.danger};
    }
    .alert {
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .alert-success {
      background-color: #d1fae5;
      border-left: 4px solid ${COLORS.success};
    }
    .alert-warning {
      background-color: #fef3c7;
      border-left: 4px solid ${COLORS.warning};
    }
    .alert-danger {
      background-color: #fee2e2;
      border-left: 4px solid ${COLORS.danger};
    }
    .steps-list {
      margin: 16px 0;
      padding-left: 24px;
    }
    .steps-list li {
      margin: 8px 0;
      line-height: 1.8;
    }
    .signal-list {
      list-style: none;
      padding: 0;
      margin: 12px 0;
    }
    .signal-item {
      padding: 8px 12px;
      background-color: ${COLORS.white};
      border-left: 3px solid ${COLORS.danger};
      margin: 6px 0;
      border-radius: 3px;
    }
    .email-footer {
      background-color: ${COLORS.gray900};
      color: ${COLORS.gray200};
      padding: 24px;
      text-align: center;
      font-size: 14px;
    }
    .code-block {
      background-color: ${COLORS.gray900};
      color: ${COLORS.gray100};
      padding: 12px 16px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      overflow-x: auto;
      margin: 12px 0;
    }
    .timestamp {
      color: ${COLORS.gray700};
      font-size: 14px;
      font-style: italic;
    }
    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 24px 16px;
      }
      .info-label {
        display: block;
        margin-bottom: 4px;
      }
      .button {
        display: block;
        text-align: center;
        margin: 12px 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-icon">${icon}</div>
      <h1 class="email-title">${title}</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 8px 0;">UpShot Cold Email System</p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        This is an automated admin notification. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

/**
 * HTML Email Templates
 */
export class HtmlEmailTemplates {
  /**
   * CLIENT FIRST LOGIN
   */
  static clientFirstLogin(payload: ClientFirstLoginPayload): { html: string; text: string } {
    const content = `
      <p>A new client has successfully logged into their workspace for the first time.</p>
      
      <div class="alert alert-success">
        <strong>✓ First Login Detected</strong><br>
        This client is active and may need initial guidance.
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Workspace:</span>
          <span class="info-value"><strong>${payload.workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">User Email:</span>
          <span class="info-value">${payload.user_email}</span>
        </div>
        ${payload.user_name ? `
        <div class="info-row">
          <span class="info-label">User Name:</span>
          <span class="info-value">${payload.user_name}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Workspace ID:</span>
          <span class="info-value"><code>${payload.workspace_id}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Login Time:</span>
          <span class="info-value timestamp">${formatTimestamp(payload.timestamp)}</span>
        </div>
      </div>

      <h3>Recommended Actions</h3>
      <ul class="steps-list">
        <li>Monitor their initial dashboard activity</li>
        <li>Check if they need help with campaign setup</li>
        <li>Ensure workflows are properly configured</li>
        <li>Verify lead data is imported (if applicable)</li>
      </ul>
    `;

    const text = `
New Client First Login: ${payload.workspace_name}

A new client has logged into their workspace for the first time.

Workspace: ${payload.workspace_name}
User Email: ${payload.user_email}
${payload.user_name ? `User Name: ${payload.user_name}\n` : ''}Workspace ID: ${payload.workspace_id}
Login Time: ${formatTimestamp(payload.timestamp)}

Recommended Actions:
• Monitor their initial dashboard activity
• Check if they need help with campaign setup
• Ensure workflows are properly configured
• Verify lead data is imported (if applicable)
    `;

    return {
      html: wrapWithLayout(content, `New Client Login: ${payload.workspace_name}`, '🎉'),
      text: text.trim(),
    };
  }

  /**
   * DROPLET READY FOR SETUP
   */
  static dropletReady(payload: DropletReadyPayload): { html: string; text: string } {
    const content = `
      <p>A new client's engine has been successfully provisioned and is ready for manual setup and configuration.</p>
      
      <div class="alert alert-success">
        <strong>✓ Engine Provisioned</strong><br>
        The droplet is running and n8n is accessible.
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Workspace:</span>
          <span class="info-value"><strong>${payload.workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">User Email:</span>
          <span class="info-value">${payload.user_email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Provisioned:</span>
          <span class="info-value timestamp">${formatTimestamp(payload.timestamp)}</span>
        </div>
      </div>

      <h3>Access Credentials</h3>
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">n8n URL:</span>
          <span class="info-value"><a href="${payload.n8n_url}" style="color: ${COLORS.primary};">${payload.n8n_url}</a></span>
        </div>
        <div class="info-row">
          <span class="info-label">Owner Email:</span>
          <span class="info-value"><code>${payload.n8n_owner_email}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Owner Password:</span>
          <span class="info-value"><code>${payload.n8n_owner_password}</code></span>
        </div>
      </div>

      <div class="alert alert-warning">
        <strong>⚠ Security Notice</strong><br>
        These credentials are for first-time setup only. Change the password after initial configuration.
      </div>

      <h3>Setup Checklist</h3>
      <ol class="steps-list">
        <li>Navigate to n8n URL (create owner account on first visit)</li>
        <li>Import 7 workflow templates (Email 1-3, Research, Opt-Out, Reply Tracker, Email Preparation)</li>
        <li>Customize AI prompts for client's brand and voice</li>
        <li>Configure and verify all credentials (Gmail, LinkedIn, OpenAI)</li>
        <li>Import client's lead data (if available)</li>
        <li>Run production test sequence</li>
        <li>Mark setup as complete in admin dashboard</li>
      </ol>

      <a href="${payload.admin_dashboard_url}" class="button">Open Admin Dashboard</a>
      <a href="${payload.n8n_url}" class="button button-success">Access n8n</a>
    `;

    const text = `
New Client Ready for Setup: ${payload.workspace_name}

A new client's engine has been provisioned and is ready for setup.

Workspace: ${payload.workspace_name}
User Email: ${payload.user_email}
Provisioned: ${formatTimestamp(payload.timestamp)}

ACCESS CREDENTIALS:
n8n URL: ${payload.n8n_url}
Owner Email: ${payload.n8n_owner_email}
Owner Password: ${payload.n8n_owner_password}

SETUP CHECKLIST:
1. Navigate to n8n URL (create owner account on first visit)
2. Import 7 workflow templates
3. Customize AI prompts for client's brand
4. Configure and verify all credentials
5. Import client's lead data (if available)
6. Run production test sequence
7. Mark setup as complete in dashboard

Admin Dashboard: ${payload.admin_dashboard_url}
    `;

    return {
      html: wrapWithLayout(content, `Client Ready for Setup: ${payload.workspace_name}`, '🚀'),
      text: text.trim(),
    };
  }

  /**
   * HIGH-RISK SIGNUP DETECTED
   */
  static highRiskSignup(payload: HighRiskSignupPayload): { html: string; text: string } {
    const signalsHtml = payload.signals.map(s => 
      `<li class="signal-item">⚠️ ${s}</li>`
    ).join('');

    const riskBadgeColor = 
      payload.risk_level === 'high' ? COLORS.danger :
      payload.risk_level === 'medium' ? COLORS.warning :
      COLORS.success;

    const content = `
      <div class="alert alert-danger">
        <strong>⚠️ MANUAL REVIEW REQUIRED</strong><br>
        A high-risk signup has been flagged and requires immediate attention.
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Workspace:</span>
          <span class="info-value"><strong>${payload.workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">User Email:</span>
          <span class="info-value">${payload.user_email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Risk Score:</span>
          <span class="info-value">
            <strong style="color: ${riskBadgeColor};">${payload.risk_score}/100</strong>
            <span style="background-color: ${riskBadgeColor}; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 8px; font-size: 12px; font-weight: 600;">
              ${payload.risk_level.toUpperCase()}
            </span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Detected:</span>
          <span class="info-value timestamp">${formatTimestamp(payload.timestamp)}</span>
        </div>
      </div>

      <h3>Risk Signals Detected</h3>
      <ul class="signal-list">
        ${signalsHtml}
      </ul>

      <h3>Required Actions</h3>
      <div style="margin: 24px 0;">
        <a href="${payload.review_url}" class="button button-danger">Review Signup</a>
      </div>

      <div class="info-section">
        <p style="margin: 0 0 12px 0;"><strong>Available Actions:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Approve:</strong> Clear to proceed with ignition</li>
          <li><strong>Reject:</strong> Notify user that account cannot be verified</li>
          <li><strong>Monitor:</strong> Allow ignition but flag for enhanced surveillance</li>
        </ul>
      </div>
    `;

    const signalsText = payload.signals.map(s => `  • ${s}`).join('\n');

    const text = `
High-Risk Signup Detected: ${payload.workspace_name}

⚠️ MANUAL REVIEW REQUIRED
A high-risk signup has been detected and is pending review.

Workspace: ${payload.workspace_name}
User Email: ${payload.user_email}
Risk Score: ${payload.risk_score}/100
Risk Level: ${payload.risk_level.toUpperCase()}
Detected: ${formatTimestamp(payload.timestamp)}

RISK SIGNALS DETECTED:
${signalsText}

Review this signup: ${payload.review_url}

AVAILABLE ACTIONS:
• Approve: Clear to proceed with ignition
• Reject: Notify user that account cannot be verified
• Monitor: Allow ignition but flag for enhanced surveillance
    `;

    return {
      html: wrapWithLayout(content, `High-Risk Signup: ${payload.workspace_name}`, '⚠️'),
      text: text.trim(),
    };
  }

  /**
   * NEW CAMPAIGN CREATED
   */
  static newCampaign(payload: NewCampaignPayload): { html: string; text: string } {
    const content = `
      <p>A new campaign has been created${payload.needs_setup ? ' and requires workflow setup' : ' and is ready to use'}.</p>
      
      ${payload.needs_setup ? `
      <div class="alert alert-warning">
        <strong>⚙️ Setup Required</strong><br>
        This campaign needs workflow configuration before it can be activated.
      </div>
      ` : `
      <div class="alert alert-success">
        <strong>✓ Ready to Use</strong><br>
        This campaign is fully configured and can be activated.
      </div>
      `}

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Workspace:</span>
          <span class="info-value"><strong>${payload.workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Campaign Name:</span>
          <span class="info-value"><strong>${payload.campaign_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Campaign ID:</span>
          <span class="info-value"><code>${payload.campaign_id}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Created:</span>
          <span class="info-value timestamp">${formatTimestamp(payload.timestamp)}</span>
        </div>
      </div>

      ${payload.needs_setup ? `
      <h3>Setup Steps Required</h3>
      <ol class="steps-list">
        <li>Clone workflow templates for this campaign</li>
        <li>Customize AI prompts for campaign-specific messaging</li>
        <li>Verify email sending credentials</li>
        <li>Import campaign lead data</li>
        <li>Activate campaign workflows</li>
      </ol>
      ` : ''}
    `;

    const text = `
New Campaign Created: ${payload.campaign_name}

A new campaign has been created${payload.needs_setup ? ' and needs workflow setup' : ' and is ready'}.

Workspace: ${payload.workspace_name}
Campaign: ${payload.campaign_name}
Campaign ID: ${payload.campaign_id}
Created: ${formatTimestamp(payload.timestamp)}

${payload.needs_setup ? `
SETUP REQUIRED:
1. Clone workflow templates for this campaign
2. Customize AI prompts for campaign-specific messaging
3. Verify email sending credentials
4. Import campaign lead data
5. Activate campaign workflows
` : ''}
    `;

    return {
      html: wrapWithLayout(content, `New Campaign: ${payload.campaign_name}`, '📢'),
      text: text.trim(),
    };
  }

  /**
   * IGNITION FAILED
   */
  static ignitionFailed(payload: IgnitionFailedPayload): { html: string; text: string } {
    const content = `
      <div class="alert alert-danger">
        <strong>❌ CRITICAL: Ignition Failed</strong><br>
        Droplet provisioning has failed after ${payload.retry_count} retry attempts. Manual intervention required.
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Workspace:</span>
          <span class="info-value"><strong>${payload.workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Workspace ID:</span>
          <span class="info-value"><code>${payload.workspace_id}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Failed At:</span>
          <span class="info-value timestamp">${formatTimestamp(payload.failed_at)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Retry Attempts:</span>
          <span class="info-value"><strong style="color: ${COLORS.danger};">${payload.retry_count}</strong></span>
        </div>
      </div>

      <h3>Error Details</h3>
      <div class="code-block">
        ${payload.error_message}
      </div>

      <h3>Possible Causes</h3>
      <ul class="steps-list">
        <li>DigitalOcean API quota exceeded or rate limited</li>
        <li>Insufficient account balance</li>
        <li>Region capacity issues</li>
        <li>Invalid cloud-init script</li>
        <li>Network connectivity problems</li>
        <li>SSH key configuration error</li>
      </ul>

      <h3>Next Steps</h3>
      <div class="alert alert-warning">
        <p style="margin: 0 0 12px 0;"><strong>User Notification:</strong></p>
        <p style="margin: 0; font-style: italic;">
          "We're experiencing technical difficulties provisioning your workspace. 
          Our team has been notified and will resolve this issue shortly."
        </p>
      </div>

      <ol class="steps-list">
        <li>Check DigitalOcean account status and quotas</li>
        <li>Verify billing and available credits</li>
        <li>Review cloud-init logs if droplet was created</li>
        <li>Check for API rate limiting</li>
        <li>Attempt manual droplet creation</li>
        <li>Contact DigitalOcean support if issue persists</li>
        <li>Update client with ETA once resolved</li>
      </ol>
    `;

    const text = `
Ignition Failed (${payload.retry_count} retries): ${payload.workspace_name}

❌ CRITICAL: MANUAL INTERVENTION REQUIRED

Droplet provisioning has failed after ${payload.retry_count} retry attempts.

Workspace: ${payload.workspace_name}
Workspace ID: ${payload.workspace_id}
Failed At: ${formatTimestamp(payload.failed_at)}
Retry Count: ${payload.retry_count}

ERROR:
${payload.error_message}

POSSIBLE CAUSES:
• DigitalOcean API quota exceeded or rate limited
• Insufficient account balance
• Region capacity issues
• Invalid cloud-init script
• Network connectivity problems
• SSH key configuration error

USER NOTIFICATION SENT:
"We're experiencing technical difficulties provisioning your workspace. 
Our team has been notified and will resolve this issue shortly."

NEXT STEPS:
1. Check DigitalOcean account status and quotas
2. Verify billing and available credits
3. Review cloud-init logs if droplet was created
4. Check for API rate limiting
5. Attempt manual droplet creation
6. Contact DigitalOcean support if issue persists
7. Update client with ETA once resolved
    `;

    return {
      html: wrapWithLayout(content, `Ignition Failed: ${payload.workspace_name}`, '❌'),
      text: text.trim(),
    };
  }

  /**
   * SETUP NOT REVIEWED (24H ESCALATION)
   */
  static setupNotReviewed(payload: SetupNotReviewedPayload): { html: string; text: string } {
    const content = `
      <div class="alert alert-danger">
        <strong>⚠️ ESCALATION: Overdue Setup Tasks</strong><br>
        Multiple workspaces have exceeded the 24-hour setup threshold and require immediate attention.
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Pending Workspaces:</span>
          <span class="info-value"><strong style="color: ${COLORS.danger}; font-size: 24px;">${payload.pending_count}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Oldest Workspace:</span>
          <span class="info-value"><strong>${payload.oldest_workspace_name}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Workspace ID:</span>
          <span class="info-value"><code>${payload.oldest_workspace_id}</code></span>
        </div>
        <div class="info-row">
          <span class="info-label">Hours Pending:</span>
          <span class="info-value"><strong style="color: ${COLORS.danger};">${payload.hours_pending}+ hours</strong></span>
        </div>
      </div>

      <h3>Impact</h3>
      <div class="alert alert-warning">
        <ul style="margin: 0; padding-left: 20px;">
          <li>Clients are waiting to start generating leads</li>
          <li>Revenue opportunity delayed</li>
          <li>Risk of churn if delays continue</li>
          <li>Potential negative reviews or support tickets</li>
        </ul>
      </div>

      <h3>Required Setup Tasks</h3>
      <ol class="steps-list">
        <li>Import 7 workflow templates into n8n</li>
        <li>Customize AI prompts for client's brand voice</li>
        <li>Configure and verify credentials (Gmail, LinkedIn, OpenAI)</li>
        <li>Import client lead data (if provided)</li>
        <li>Run production test sequence</li>
        <li>Mark setup as complete</li>
        <li>Notify client that system is ready</li>
      </ol>

      <div style="margin: 32px 0;">
        <p style="font-size: 18px; font-weight: 600; color: ${COLORS.danger};">
          ⏰ IMMEDIATE ACTION REQUIRED
        </p>
        <p>
          These clients have been waiting for ${payload.hours_pending}+ hours. 
          Please prioritize these setups to maintain service quality and client satisfaction.
        </p>
      </div>
    `;

    const text = `
⚠️ ESCALATION: ${payload.pending_count} Workspace${payload.pending_count > 1 ? 's' : ''} Awaiting Setup (${payload.hours_pending}+ Hours)

MULTIPLE WORKSPACES HAVE EXCEEDED THE 24-HOUR SETUP THRESHOLD

Pending Workspaces: ${payload.pending_count}
Oldest Workspace: ${payload.oldest_workspace_name}
Workspace ID: ${payload.oldest_workspace_id}
Hours Pending: ${payload.hours_pending}+ hours

IMPACT:
• Clients are waiting to start generating leads
• Revenue opportunity delayed
• Risk of churn if delays continue
• Potential negative reviews or support tickets

REQUIRED SETUP TASKS:
1. Import 7 workflow templates into n8n
2. Customize AI prompts for client's brand voice
3. Configure and verify credentials
4. Import client lead data (if provided)
5. Run production test sequence
6. Mark setup as complete
7. Notify client that system is ready

⏰ IMMEDIATE ACTION REQUIRED
These clients have been waiting for ${payload.hours_pending}+ hours.
Please prioritize these setups to maintain service quality.
    `;

    return {
      html: wrapWithLayout(content, `${payload.pending_count} Overdue Setup${payload.pending_count > 1 ? 's' : ''}`, '⚠️'),
      text: text.trim(),
    };
  }
}

/**
 * Get HTML and plain text versions for a notification
 */
export function getNotificationEmail(
  eventType: string,
  payload: any
): { html: string; text: string; subject: string } {
  let result: { html: string; text: string };
  let subject: string;

  switch (eventType) {
    case 'client_first_login':
      result = HtmlEmailTemplates.clientFirstLogin(payload);
      subject = `🎉 New Client Login: ${payload.workspace_name}`;
      break;

    case 'droplet_ready_for_setup':
      result = HtmlEmailTemplates.dropletReady(payload);
      subject = `🚀 Client Ready for Setup: ${payload.workspace_name}`;
      break;

    case 'high_risk_signup':
      result = HtmlEmailTemplates.highRiskSignup(payload);
      subject = `⚠️ High-Risk Signup: ${payload.workspace_name}`;
      break;

    case 'new_campaign_created':
      result = HtmlEmailTemplates.newCampaign(payload);
      subject = `📢 New Campaign: ${payload.campaign_name}`;
      break;

    case 'ignition_failed':
      result = HtmlEmailTemplates.ignitionFailed(payload);
      subject = `❌ Ignition Failed (${payload.retry_count} retries): ${payload.workspace_name}`;
      break;

    case 'setup_not_reviewed_24h':
      result = HtmlEmailTemplates.setupNotReviewed(payload);
      subject = `⚠️ OVERDUE: ${payload.pending_count} Setup${payload.pending_count > 1 ? 's' : ''} (${payload.hours_pending}+ hrs)`;
      break;

    default:
      throw new Error(`Unknown notification event type: ${eventType}`);
  }

  return {
    ...result,
    subject,
  };
}
