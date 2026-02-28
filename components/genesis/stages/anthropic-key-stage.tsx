/**
 * PHASE 64: Anthropic Key Stage
 * 
 * Stage 5: Collect and validate Anthropic (Claude) API key.
 */

'use client';

import { ApiKeyInputStage } from './api-key-input-stage';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

export function AnthropicKeyStage(props: StageComponentProps) {
  return (
    <ApiKeyInputStage
      {...props}
      credentialType="anthropic_api_key"
      title="Anthropic API Key"
      description="Provide your Claude API key for AI-powered email generation"
      placeholder="sk-ant-..."
      helpText="Your Anthropic API key is used for Claude Sonnet and Opus models. You'll be charged directly by Anthropic based on usage."
      docsUrl="https://console.anthropic.com/settings/keys"
    />
  );
}
