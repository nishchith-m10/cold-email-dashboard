/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Type definitions for risk scoring
 */

/**
 * Risk levels based on total score
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Admin actions for post-ignition review
 */
export type AdminAction = 'none' | 'monitoring' | 'suspended';

/**
 * Individual risk signals that contribute to total score
 */
export interface RiskSignals {
  email_domain_score: number;        // 0 or +50 (disposable)
  ip_reputation_score: number;       // 0 or +20 (VPN/proxy)
  signup_frequency_score: number;    // 0 or +30 (3+ from same IP)
  tier_appropriateness_score: number; // 0 or +25 (enterprise on day 1)
  credential_validation_score: number; // 0 or +40 (validation failures)
  region_mismatch_score: number;     // 0 or +15 (region + VPN mismatch)
}

/**
 * Complete risk score record
 */
export interface RiskScore extends RiskSignals {
  workspace_id: string;
  total_score: number;
  risk_level: RiskLevel;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  admin_reviewed_at: Date | null;
  admin_action: AdminAction | null;
  admin_notes: string | null;
}

/**
 * Input context for risk assessment
 */
export interface RiskAssessmentContext {
  workspace_id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  region: string;
  user_locale?: string;
  openai_key?: string;
  claude_key?: string;
}

/**
 * Result of risk assessment
 */
export interface RiskAssessmentResult {
  workspace_id: string;
  signals: RiskSignals;
  total_score: number;
  risk_level: RiskLevel;
  should_notify_admin: boolean;
  metadata: {
    ip_address: string;
    user_agent: string;
    assessed_at: Date;
  };
}

/**
 * Signal provider response
 */
export interface SignalProviderResult {
  score: number;
  detected: boolean;
  reason: string;
  provider: string;
}

/**
 * Admin notification payload for high-risk signups
 */
export interface HighRiskNotification {
  workspace_id: string;
  workspace_name: string;
  user_email: string;
  risk_score: number;
  risk_level: RiskLevel;
  signals: Array<{ signal: string; score: number; reason: string }>;
  ignition_status: 'proceeding' | 'completed';
  dashboard_url: string;
}

/**
 * Risk thresholds configuration
 */
export interface RiskThresholds {
  low_max: number;      // Default: 20
  medium_max: number;   // Default: 50
  high_min: number;     // Default: 51
}

/**
 * Risk scoring constants
 */
export const RISK_SCORES = {
  DISPOSABLE_EMAIL: 50,
  VPN_PROXY: 20,
  SIGNUP_FREQUENCY_ABUSE: 30,
  ENTERPRISE_DAY_ONE: 25,
  CREDENTIAL_VALIDATION_FAILURE: 40,
  REGION_MISMATCH: 15,
} as const;

/**
 * Default risk thresholds
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  low_max: 20,
  medium_max: 50,
  high_min: 51,
};

/**
 * Determine risk level from total score
 */
export function calculateRiskLevel(
  totalScore: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskLevel {
  if (totalScore <= thresholds.low_max) return 'low';
  if (totalScore <= thresholds.medium_max) return 'medium';
  return 'high';
}

/**
 * Check if admin notification is required
 */
export function shouldNotifyAdmin(
  riskLevel: RiskLevel,
  totalScore: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): boolean {
  return riskLevel === 'high' && totalScore >= thresholds.high_min;
}
