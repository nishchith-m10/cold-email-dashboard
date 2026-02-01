/**
 * Knowledge Query API Route
 * 
 * POST /api/knowledge/query
 * 
 * Handles RAG queries with trust-weighted conflict resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';

// Request validation schema
const QueryRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  workspace_id: z.string().optional(),
  options: z.object({
    include_deprecated: z.boolean().optional().default(true),
    min_trust_level: z.enum(['high', 'medium', 'low']).optional().default('low'),
    max_results: z.number().min(1).max(20).optional().default(5),
    code_only: z.boolean().optional().default(false),
  }).optional()
});

// Response type
interface QueryResponse {
  answer: string;
  confidence: number;
  citations: {
    primary: {
      id: string;
      content: string;
      source: string;
      page?: number;
      url?: string;
    };
    supporting: {
      id: string;
      content: string;
      source: string;
      page?: number;
      url?: string;
    }[];
  };
  warnings: {
    type: string;
    message: string;
    source?: string;
  }[];
  structured_data?: Record<string, unknown>;
}

/**
 * POST /api/knowledge/query
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const parsed = QueryRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { question, workspace_id, options } = parsed.data;
    let workspaceId = workspace_id || 'default';

    // Initialize clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve workspace ID if not a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspaceId)) {
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('id')
        .or(`id.eq.${workspaceId},slug.eq.${workspaceId}`)
        .single();
      
      if (wsData) {
        workspaceId = wsData.id;
      } else {
        // Fallback to first workspace
        const { data: first } = await supabase
            .from('workspaces')
            .select('id')
            .limit(1)
            .single();
        if (first) workspaceId = first.id;
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    // Step 1: Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question.trim()
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Search knowledge base
    const { data: matches, error: searchError } = await supabase.rpc(
      'kb_schema.search_knowledge',
      {
        p_workspace_id: workspaceId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_limit: options?.max_results || 5,
        p_include_deprecated: options?.include_deprecated ?? true,
        p_min_trust_level: options?.min_trust_level || 'low'
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json(
        { error: 'Knowledge base search failed' },
        { status: 500 }
      );
    }

    // Filter for code-only if requested
    let filteredMatches = matches || [];
    if (options?.code_only) {
      filteredMatches = filteredMatches.filter((m: { source_type: string }) => 
        m.source_type === 'code' || m.source_type === 'schema'
      );
    }

    // Step 3: Resolve conflicts (simplified for now)
    const resolved = {
      primaryContent: filteredMatches[0]?.content || '',
      confidence: 0.8,
      primaryCitation: {
        id: filteredMatches[0]?.id || '',
        content: filteredMatches[0]?.content || '',
        source: filteredMatches[0]?.source || '',
        page: filteredMatches[0]?.page,
        url: filteredMatches[0]?.url
      },
      supportingCitations: filteredMatches.slice(1, 3).map((m: any) => ({
        id: m.id,
        content: m.content,
        source: m.source,
        page: m.page,
        url: m.url
      })),
      warnings: []
    };

    // Step 4: Generate answer using GPT-4
    const systemPrompt = `You are a knowledgeable assistant for the Cold Email Dashboard platform.
Your job is to answer questions based on the provided context from the knowledge base.

IMPORTANT RULES:
1. If the context mentions deprecated technologies (like "Google Sheets"), acknowledge that the system has migrated to the modern solution (Supabase/PostgreSQL).
2. Always cite your sources using the file paths provided.
3. If you're not confident in the answer, say so.
4. Be concise but complete.`;

    const contextPrompt = resolved.primaryContent;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${contextPrompt}\n\nQuestion: ${question}` }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate answer.';

    // Step 5: Log query to audit
    await supabase
      .from('kb_schema.kb_audit_log')
      .insert({
        workspace_id: workspaceId,
        action: 'queried',
        query_text: question,
        results_count: filteredMatches.length
      });

    // Step 6: Build response
    const response: QueryResponse = {
      answer,
      confidence: resolved.confidence,
      citations: {
        primary: resolved.primaryCitation,
        supporting: resolved.supportingCitations
      },
      warnings: resolved.warnings
    };

    // Add structured data if applicable
    if (resolved.primaryContent.includes('wait') || resolved.primaryContent.includes('delay')) {
      const waitMatch = resolved.primaryContent.match(/(\d+)\s*(?:day|hour)/i);
      if (waitMatch) {
        response.structured_data = {
          recommendation: 'wait_time',
          wait_days: parseInt(waitMatch[1]),
          source_file: resolved.primaryCitation.source
        };
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Knowledge query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge/query - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'knowledge-api',
    version: '1.0.0'
  });
}
