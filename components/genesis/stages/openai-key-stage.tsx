/**
 * PHASE 64: OpenAI Key Stage
 * 
 * Stage 4: Collect and validate OpenAI API key.
 */

'use client';

import { Sparkles } from 'lucide-react';
import { ApiKeyInputStage } from './api-key-input-stage';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

export function OpenAIKeyStage(props: StageComponentProps) {
  return (
    <ApiKeyInputStage
      {...props}
      credentialType="openai_api_key"
      title="OpenAI API Key"
      description="Provide your OpenAI API key for AI-powered email generation"
      placeholder="sk-..."
      helpText="Your OpenAI API key is used for GPT-4 and GPT-3.5 email generation. You'll be charged directly by OpenAI based on usage."
      docsUrl="https://platform.openai.com/api-keys"
      icon={Sparkles}
    />
  );
}
