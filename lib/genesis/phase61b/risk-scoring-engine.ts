/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Risk Scoring Engine
 * 
 * Coordinates all signal providers to calculate comprehensive risk score
 */

import {
  RiskAssessmentContext,
  RiskAssessmentResult,
  RiskSignals,
  calculateRiskLevel,
  shouldNotifyAdmin,
} from './risk-types';

import {
  EmailDomainProvider,
  IPReputationProvider,
  SignupFrequencyProvider,
  TierAppropriatenessProvider,
  CredentialValidationProvider,
  RegionMismatchProvider,
} from './signal-providers';

/**
 * Risk Scoring Engine
 * Orchestrates all signal providers to assess workspace risk
 */
export class RiskScoringEngine {
  /**
   * Perform comprehensive risk assessment
   */
  static async assess(context: RiskAssessmentContext): Promise<RiskAssessmentResult> {
    // Run all signal providers in parallel
    const [
      emailResult,
      ipResult,
      frequencyResult,
      tierResult,
      credentialResult,
    ] = await Promise.all([
      EmailDomainProvider.assess(context.email),
      IPReputationProvider.assess(context.ip_address),
      SignupFrequencyProvider.assess(context.ip_address),
      TierAppropriatenessProvider.assess(context.tier),
      CredentialValidationProvider.assess(context.openai_key, context.claude_key),
    ]);

    // Run region mismatch assessment (depends on VPN detection)
    const regionResult = await RegionMismatchProvider.assess(
      context.region,
      context.user_locale,
      ipResult.detected
    );

    // Build risk signals object
    const signals: RiskSignals = {
      email_domain_score: emailResult.score,
      ip_reputation_score: ipResult.score,
      signup_frequency_score: frequencyResult.score,
      tier_appropriateness_score: tierResult.score,
      credential_validation_score: credentialResult.score,
      region_mismatch_score: regionResult.score,
    };

    // Calculate total score
    const total_score = Object.values(signals).reduce((sum, score) => sum + score, 0);

    // Determine risk level
    const risk_level = calculateRiskLevel(total_score);

    // Check if admin notification is needed
    const should_notify_admin = shouldNotifyAdmin(risk_level, total_score);

    return {
      workspace_id: context.workspace_id,
      signals,
      total_score,
      risk_level,
      should_notify_admin,
      metadata: {
        ip_address: context.ip_address,
        user_agent: context.user_agent,
        assessed_at: new Date(),
      },
    };
  }

  /**
   * Get detailed breakdown of risk assessment
   */
  static async getAssessmentBreakdown(
    context: RiskAssessmentContext
  ): Promise<{
    result: RiskAssessmentResult;
    details: Array<{
      signal: string;
      score: number;
      detected: boolean;
      reason: string;
      provider: string;
    }>;
  }> {
    // Run all assessments
    const [
      emailResult,
      ipResult,
      frequencyResult,
      tierResult,
      credentialResult,
    ] = await Promise.all([
      EmailDomainProvider.assess(context.email),
      IPReputationProvider.assess(context.ip_address),
      SignupFrequencyProvider.assess(context.ip_address),
      TierAppropriatenessProvider.assess(context.tier),
      CredentialValidationProvider.assess(context.openai_key, context.claude_key),
    ]);

    const regionResult = await RegionMismatchProvider.assess(
      context.region,
      context.user_locale,
      ipResult.detected
    );

    // Build signals
    const signals: RiskSignals = {
      email_domain_score: emailResult.score,
      ip_reputation_score: ipResult.score,
      signup_frequency_score: frequencyResult.score,
      tier_appropriateness_score: tierResult.score,
      credential_validation_score: credentialResult.score,
      region_mismatch_score: regionResult.score,
    };

    const total_score = Object.values(signals).reduce((sum, score) => sum + score, 0);
    const risk_level = calculateRiskLevel(total_score);
    const should_notify_admin = shouldNotifyAdmin(risk_level, total_score);

    // Build detailed breakdown
    const details = [
      {
        signal: 'email_domain',
        score: emailResult.score,
        detected: emailResult.detected,
        reason: emailResult.reason,
        provider: emailResult.provider,
      },
      {
        signal: 'ip_reputation',
        score: ipResult.score,
        detected: ipResult.detected,
        reason: ipResult.reason,
        provider: ipResult.provider,
      },
      {
        signal: 'signup_frequency',
        score: frequencyResult.score,
        detected: frequencyResult.detected,
        reason: frequencyResult.reason,
        provider: frequencyResult.provider,
      },
      {
        signal: 'tier_appropriateness',
        score: tierResult.score,
        detected: tierResult.detected,
        reason: tierResult.reason,
        provider: tierResult.provider,
      },
      {
        signal: 'credential_validation',
        score: credentialResult.score,
        detected: credentialResult.detected,
        reason: credentialResult.reason,
        provider: credentialResult.provider,
      },
      {
        signal: 'region_mismatch',
        score: regionResult.score,
        detected: regionResult.detected,
        reason: regionResult.reason,
        provider: regionResult.provider,
      },
    ];

    return {
      result: {
        workspace_id: context.workspace_id,
        signals,
        total_score,
        risk_level,
        should_notify_admin,
        metadata: {
          ip_address: context.ip_address,
          user_agent: context.user_agent,
          assessed_at: new Date(),
        },
      },
      details,
    };
  }

  /**
   * Validate risk assessment context
   */
  static validateContext(context: RiskAssessmentContext): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!context.workspace_id) {
      errors.push('workspace_id is required');
    }

    if (!context.email || !context.email.includes('@')) {
      errors.push('valid email is required');
    }

    if (!context.ip_address) {
      errors.push('ip_address is required');
    }

    if (!context.user_agent) {
      errors.push('user_agent is required');
    }

    if (!['starter', 'professional', 'scale', 'enterprise'].includes(context.tier)) {
      errors.push('tier must be one of: starter, professional, scale, enterprise');
    }

    if (!context.region) {
      errors.push('region is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
