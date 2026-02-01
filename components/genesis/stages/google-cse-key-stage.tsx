/**
 * PHASE 64: Google CSE Key Stage
 * 
 * Stage 6: Collect and validate Google Custom Search API key + Engine ID.
 */

'use client';

import { Search } from 'lucide-react';
import { ApiKeyInputStage } from './api-key-input-stage';
import type { StageComponentProps } from '@/components/genesis/genesis-onboarding-wizard';

export function GoogleCSEKeyStage(props: StageComponentProps) {
  return (
    <ApiKeyInputStage
      {...props}
      credentialType="google_cse_api_key"
      title="Google Custom Search"
      description="Provide your Google CSE credentials for lead enrichment"
      placeholder="AIza..."
      helpText="Genesis uses Google Custom Search to enrich lead data and find relevant information about companies."
      docsUrl="https://developers.google.com/custom-search/v1/introduction"
      icon={Search}
      extraFields={[
        {
          key: 'engineId',
          label: 'Search Engine ID',
          placeholder: 'Enter your CSE Engine ID',
          required: true,
        },
      ]}
    />
  );
}
