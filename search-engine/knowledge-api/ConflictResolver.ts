export interface Citation {
  id: string;
  source: string;
  source_type: string;
  trust_level: 'high' | 'medium' | 'low';
  last_updated: string;
  content: string;
  similarity: number;
}

export interface Warning {
  type: string;
  message: string;
}

export interface ResolvedContext {
  primaryContent: string;
  confidence: number;
  primaryCitation: Citation;
  supportingCitations: Citation[];
  warnings: Warning[];
}

export class ConflictResolver {
  /**
   * Resolves conflicts between multiple knowledge base matches
   * Prioritizes high-trust sources and recent updates
   */
  resolve(matches: any[]): ResolvedContext {
    if (!matches || matches.length === 0) {
      return {
        primaryContent: '',
        confidence: 0,
        primaryCitation: {
          id: '',
          source: '',
          source_type: '',
          trust_level: 'low',
          last_updated: '',
          content: '',
          similarity: 0
        },
        supportingCitations: [],
        warnings: [{ type: 'no_data', message: 'No knowledge base matches found.' }]
      };
    }

    // Sort by trust level and then date
    const sorted = [...matches].sort((a, b) => {
      const trustScore = { high: 3, medium: 2, low: 1 };
      const trustA = trustScore[a.trust_level as keyof typeof trustScore] || 0;
      const trustB = trustScore[b.trust_level as keyof typeof trustScore] || 0;

      if (trustA !== trustB) return trustB - trustA;
      
      // If trust is equal, prefer newer content
      return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
    });

    const primary = sorted[0];
    const rest = sorted.slice(1);

    // Identify contradictions (simplified logic)
    const warnings: Warning[] = [];
    const hasHighTrustContradiction = rest.some(
      m => m.trust_level === 'high' && m.id !== primary.id
    );

    if (hasHighTrustContradiction) {
      warnings.push({
        type: 'contradiction',
        message: 'Multiple high-trust sources found. Primary source selected based on recency.'
      });
    }

    return {
      primaryContent: primary.content,
      confidence: primary.similarity, // Use vector similarity as confidence proxy
      primaryCitation: {
        id: primary.id,
        source: primary.source_path || primary.file_path,
        source_type: primary.source_type,
        trust_level: primary.trust_level,
        last_updated: primary.last_updated,
        content: primary.content,
        similarity: primary.similarity
      },
      supportingCitations: rest.map(m => ({
        id: m.id,
        source: m.source_path || m.file_path,
        source_type: m.source_type,
        trust_level: m.trust_level,
        last_updated: m.last_updated,
        content: m.content,
        similarity: m.similarity
      })),
      warnings
    };
  }

  /**
   * Formats the resolved context for an LLM prompt
   */
  formatForPrompt(context: ResolvedContext): string {
    if (!context.primaryContent) return 'No context available.';

    let prompt = `Primary Source (${context.primaryCitation.source}):\n${context.primaryContent}\n\n`;

    if (context.supportingCitations.length > 0) {
      prompt += 'Supporting Sources:\n';
      context.supportingCitations.slice(0, 3).forEach(c => {
        prompt += `- [${c.source}]: ${c.content.substring(0, 200)}...\n`;
      });
    }

    return prompt;
  }
}
