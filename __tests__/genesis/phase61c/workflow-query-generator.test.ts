/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Query Generator Tests
 */

import { WorkflowQueryGenerator } from '@/lib/genesis/phase61c/workflow-query-generator';
import type { WorkflowQueryParams } from '@/lib/genesis/phase61c/workflow-types';

describe('WorkflowQueryGenerator', () => {
  const params: WorkflowQueryParams = {
    workspace_id: '123e4567-e89b-12d3-a456-426614174000',
    campaign_name: 'Tech CTOs',
  };

  describe('generateEmailPrepQuery', () => {
    it('should generate correct email prep query', () => {
      const query = WorkflowQueryGenerator.generateEmailPrepQuery(params);

      expect(query).toContain('FROM genesis.leads');
      expect(query).toContain(`workspace_id = '${params.workspace_id}'`);
      expect(query).toContain(`campaign_name = '${params.campaign_name}'`);
      expect(query).toContain('email_prep = false');
      expect(query).toContain('LIMIT 125');
    });

    it('should exclude bounced and opted out leads', () => {
      const query = WorkflowQueryGenerator.generateEmailPrepQuery(params);

      expect(query).toContain('bounced = false');
      expect(query).toContain('opted_out = false');
    });
  });

  describe('generateEmail1Query', () => {
    it('should generate correct email 1 query', () => {
      const query = WorkflowQueryGenerator.generateEmail1Query(params);

      expect(query).toContain('email_prep = true');
      expect(query).toContain('email_1_sent = false');
    });
  });

  describe('generateEmail2Query', () => {
    it('should generate correct email 2 query', () => {
      const query = WorkflowQueryGenerator.generateEmail2Query(params);

      expect(query).toContain('email_1_sent = true');
      expect(query).toContain('email_2_sent = false');
    });
  });

  describe('generateEmail3Query', () => {
    it('should generate correct email 3 query', () => {
      const query = WorkflowQueryGenerator.generateEmail3Query(params);

      expect(query).toContain('email_2_sent = true');
      expect(query).toContain('email_3_sent = false');
    });
  });

  describe('generateReplyTrackerQuery', () => {
    it('should generate correct reply tracker query', () => {
      const query = WorkflowQueryGenerator.generateReplyTrackerQuery(params);

      expect(query).toContain('email_1_sent = true OR email_2_sent = true OR email_3_sent = true');
      expect(query).toContain('replied = false');
    });
  });

  describe('generateResearchReportQuery', () => {
    it('should generate correct research report query', () => {
      const query = WorkflowQueryGenerator.generateResearchReportQuery(params);

      expect(query).toContain('email_prep = false');
      expect(query).toContain('research_complete = false');
    });
  });

  describe('generateOptOutQuery', () => {
    it('should generate correct opt-out query', () => {
      const query = WorkflowQueryGenerator.generateOptOutQuery(params);

      expect(query).toContain('opted_out = false');
      expect(query).toContain(`campaign_name = '${params.campaign_name}'`);
    });
  });

  describe('generateEmailStepQuery', () => {
    it('should generate query for email step 1', () => {
      const query = WorkflowQueryGenerator.generateEmailStepQuery(params, 1);
      expect(query).toContain('email_1_sent = false');
    });

    it('should generate query for email step 2', () => {
      const query = WorkflowQueryGenerator.generateEmailStepQuery(params, 2);
      expect(query).toContain('email_2_sent = false');
    });

    it('should generate query for email step 3', () => {
      const query = WorkflowQueryGenerator.generateEmailStepQuery(params, 3);
      expect(query).toContain('email_3_sent = false');
    });

    it('should throw error for invalid step', () => {
      expect(() => {
        WorkflowQueryGenerator.generateEmailStepQuery(params, 4 as any);
      }).toThrow('Invalid email step');
    });
  });

  describe('validateParams', () => {
    it('should validate correct params', () => {
      const result = WorkflowQueryGenerator.validateParams(params);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing workspace_id', () => {
      const invalidParams = { ...params, workspace_id: '' };
      const result = WorkflowQueryGenerator.validateParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('workspace_id'))).toBe(true);
    });

    it('should reject missing campaign_name', () => {
      const invalidParams = { ...params, campaign_name: '' };
      const result = WorkflowQueryGenerator.validateParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('campaign_name'))).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidParams = { ...params, workspace_id: 'invalid-uuid' };
      const result = WorkflowQueryGenerator.validateParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('valid UUID'))).toBe(true);
    });

    it('should accept valid UUID formats', () => {
      const uuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000',
      ];

      uuids.forEach(uuid => {
        const testParams = { ...params, workspace_id: uuid };
        const result = WorkflowQueryGenerator.validateParams(testParams);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('escapeSqlString', () => {
    it('should escape single quotes', () => {
      const result = WorkflowQueryGenerator.escapeSqlString("O'Reilly");
      expect(result).toBe("O''Reilly");
    });

    it('should handle multiple single quotes', () => {
      const result = WorkflowQueryGenerator.escapeSqlString("It's O'Reilly's");
      expect(result).toBe("It''s O''Reilly''s");
    });

    it('should leave strings without quotes unchanged', () => {
      const result = WorkflowQueryGenerator.escapeSqlString("Normal String");
      expect(result).toBe("Normal String");
    });
  });

  describe('generateSafeQuery', () => {
    it('should escape campaign names in queries', () => {
      const paramsWithQuote: WorkflowQueryParams = {
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        campaign_name: "O'Reilly CTOs",
      };

      const query = WorkflowQueryGenerator.generateSafeQuery(paramsWithQuote, 'email_1');
      
      expect(query).toContain("O''Reilly CTOs");
    });

    it('should generate safe queries for all types', () => {
      const types = [
        'email_prep',
        'email_1',
        'email_2',
        'email_3',
        'reply_tracker',
        'research_report',
        'opt_out',
      ] as const;

      types.forEach(type => {
        const query = WorkflowQueryGenerator.generateSafeQuery(params, type);
        expect(query).toContain('FROM genesis.leads');
      });
    });
  });

  describe('Integration: All Queries', () => {
    it('should generate all workflow queries successfully', () => {
      const queries = {
        emailPrep: WorkflowQueryGenerator.generateEmailPrepQuery(params),
        email1: WorkflowQueryGenerator.generateEmail1Query(params),
        email2: WorkflowQueryGenerator.generateEmail2Query(params),
        email3: WorkflowQueryGenerator.generateEmail3Query(params),
        replyTracker: WorkflowQueryGenerator.generateReplyTrackerQuery(params),
        researchReport: WorkflowQueryGenerator.generateResearchReportQuery(params),
        optOut: WorkflowQueryGenerator.generateOptOutQuery(params),
      };

      // All queries should contain workspace_id and campaign_name
      Object.values(queries).forEach(query => {
        expect(query).toContain(params.workspace_id);
        expect(query).toContain(params.campaign_name);
      });

      // All queries should have LIMIT 125
      Object.values(queries).forEach(query => {
        expect(query).toContain('LIMIT 125');
      });
    });

    it('should generate unique queries for each workflow type', () => {
      const queries = [
        WorkflowQueryGenerator.generateEmailPrepQuery(params),
        WorkflowQueryGenerator.generateEmail1Query(params),
        WorkflowQueryGenerator.generateEmail2Query(params),
        WorkflowQueryGenerator.generateEmail3Query(params),
        WorkflowQueryGenerator.generateReplyTrackerQuery(params),
        WorkflowQueryGenerator.generateResearchReportQuery(params),
        WorkflowQueryGenerator.generateOptOutQuery(params),
      ];

      // All queries should be different
      const uniqueQueries = new Set(queries);
      expect(uniqueQueries.size).toBe(7);
    });
  });

  describe('Query Structure', () => {
    it('should use proper SQL formatting', () => {
      const query = WorkflowQueryGenerator.generateEmail1Query(params);

      // Should be multi-line
      expect(query.split('\n').length).toBeGreaterThan(1);

      // Should have proper WHERE clause
      expect(query).toMatch(/WHERE\s+workspace_id/);

      // Should have proper AND clauses
      expect(query.match(/AND/g)?.length).toBeGreaterThan(0);
    });

    it('should maintain consistent naming conventions', () => {
      const queries = [
        WorkflowQueryGenerator.generateEmailPrepQuery(params),
        WorkflowQueryGenerator.generateEmail1Query(params),
      ];

      queries.forEach(query => {
        // Should use snake_case for columns
        expect(query).toMatch(/workspace_id/);
        expect(query).toMatch(/campaign_name/);
        
        // Should use genesis.leads table
        expect(query).toContain('genesis.leads');
      });
    });
  });
});
