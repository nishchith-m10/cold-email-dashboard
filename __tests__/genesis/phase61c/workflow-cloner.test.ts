/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Cloner Tests
 */

import { WorkflowCloner } from '@/lib/genesis/phase61c/workflow-cloner';
import type { N8nWorkflow, WorkflowReplacementContext } from '@/lib/genesis/phase61c/workflow-types';

describe('WorkflowCloner', () => {
  const createMockWorkflow = (campaignName: string): N8nWorkflow => ({
    id: 'workflow-123',
    name: `Email 1 - ${campaignName}`,
    active: true,
    nodes: [
      {
        name: 'Supabase Node',
        type: 'n8n-nodes-base.supabase',
        position: [250, 300],
        parameters: {
          operation: 'getAll',
          table: 'genesis.leads',
          query: `SELECT * FROM genesis.leads WHERE campaign_name = '${campaignName}'`,
        },
      },
      {
        name: 'Gmail Node',
        type: 'n8n-nodes-base.gmail',
        position: [450, 300],
        parameters: {
          subject: `Email for ${campaignName}`,
          message: `This is an email for the ${campaignName} campaign`,
        },
      },
    ],
    connections: {},
    staticData: {
      campaign: campaignName,
    },
  });

  const context: WorkflowReplacementContext = {
    source_campaign: 'Tech CTOs',
    target_campaign: 'Marketing VPs',
    workspace_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  describe('cloneWorkflow', () => {
    it('should clone workflow with new campaign name', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      const cloned = WorkflowCloner.cloneWorkflow(sourceWorkflow, context);

      expect(cloned.name).toBe('Email 1 - Marketing VPs');
      expect(cloned.id).toBeUndefined();
      expect(cloned.active).toBe(false);
    });

    it('should replace campaign name in node parameters', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      const cloned = WorkflowCloner.cloneWorkflow(sourceWorkflow, context);

      const supabaseNode = cloned.nodes.find(n => n.name === 'Supabase Node');
      expect(supabaseNode?.parameters.query).toContain('Marketing VPs');
      expect(supabaseNode?.parameters.query).not.toContain('Tech CTOs');
    });

    it('should replace campaign name in multiple node parameters', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      const cloned = WorkflowCloner.cloneWorkflow(sourceWorkflow, context);

      const gmailNode = cloned.nodes.find(n => n.name === 'Gmail Node');
      expect(gmailNode?.parameters.subject).toContain('Marketing VPs');
      expect(gmailNode?.parameters.message).toContain('Marketing VPs');
    });

    it('should replace campaign name in static data', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      const cloned = WorkflowCloner.cloneWorkflow(sourceWorkflow, context);

      expect(cloned.staticData?.campaign).toBe('Marketing VPs');
    });

    it('should not modify source workflow', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      const originalName = sourceWorkflow.name;
      
      WorkflowCloner.cloneWorkflow(sourceWorkflow, context);

      expect(sourceWorkflow.name).toBe(originalName);
      expect(sourceWorkflow.id).toBe('workflow-123');
    });

    it('should handle workflows without static data', () => {
      const sourceWorkflow = createMockWorkflow('Tech CTOs');
      delete sourceWorkflow.staticData;

      const cloned = WorkflowCloner.cloneWorkflow(sourceWorkflow, context);
      expect(cloned).toBeDefined();
    });

    it('should replace quoted campaign names in SQL', () => {
      const workflow: N8nWorkflow = {
        name: 'Email 1 - Tech CTOs',
        active: true,
        nodes: [{
          name: 'Query Node',
          type: 'n8n-nodes-base.postgres',
          position: [250, 300],
          parameters: {
            query: `SELECT * FROM leads WHERE campaign_name = "Tech CTOs"`,
          },
        }],
        connections: {},
      };

      const cloned = WorkflowCloner.cloneWorkflow(workflow, context);
      const queryNode = cloned.nodes[0];
      
      expect(queryNode.parameters.query).toContain('"Marketing VPs"');
    });
  });

  describe('validateWorkflow', () => {
    it('should validate correct workflow', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      const result = WorkflowCloner.validateWorkflow(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow without name', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      workflow.name = '';

      const result = WorkflowCloner.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name is missing'))).toBe(true);
    });

    it('should reject workflow without nodes', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      workflow.nodes = [];

      const result = WorkflowCloner.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no nodes'))).toBe(true);
    });

    it('should reject workflow with invalid name format', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      workflow.name = 'Invalid Name Format';

      const result = WorkflowCloner.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match expected format'))).toBe(true);
    });
  });

  describe('extractCampaignName', () => {
    it('should extract campaign name from workflow', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      const campaign = WorkflowCloner.extractCampaignName(workflow);

      expect(campaign).toBe('Tech CTOs');
    });

    it('should return null for invalid format', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      workflow.name = 'Invalid Format';

      const campaign = WorkflowCloner.extractCampaignName(workflow);
      expect(campaign).toBeNull();
    });
  });

  describe('belongsToCampaign', () => {
    it('should identify workflow belonging to campaign', () => {
      const workflow = createMockWorkflow('Tech CTOs');
      
      expect(WorkflowCloner.belongsToCampaign(workflow, 'Tech CTOs')).toBe(true);
      expect(WorkflowCloner.belongsToCampaign(workflow, 'Marketing VPs')).toBe(false);
    });
  });

  describe('cloneMultipleWorkflows', () => {
    it('should clone multiple workflows', () => {
      const sourceWorkflows = [
        createMockWorkflow('Tech CTOs'),
        { ...createMockWorkflow('Tech CTOs'), name: 'Email 2 - Tech CTOs' },
        { ...createMockWorkflow('Tech CTOs'), name: 'Email 3 - Tech CTOs' },
      ];

      const cloned = WorkflowCloner.cloneMultipleWorkflows(sourceWorkflows, context);

      expect(cloned).toHaveLength(3);
      expect(cloned[0].name).toBe('Email 1 - Marketing VPs');
      expect(cloned[1].name).toBe('Email 2 - Marketing VPs');
      expect(cloned[2].name).toBe('Email 3 - Marketing VPs');
    });

    it('should handle empty array', () => {
      const cloned = WorkflowCloner.cloneMultipleWorkflows([], context);
      expect(cloned).toHaveLength(0);
    });
  });

  describe('generateCloneSummary', () => {
    it('should generate summary for clone operation', () => {
      const sourceWorkflows = [
        createMockWorkflow('Tech CTOs'),
        { ...createMockWorkflow('Tech CTOs'), name: 'Email 2 - Tech CTOs' },
      ];

      const clonedWorkflows = WorkflowCloner.cloneMultipleWorkflows(sourceWorkflows, context);

      const summary = WorkflowCloner.generateCloneSummary(sourceWorkflows, clonedWorkflows);

      expect(summary.source_count).toBe(2);
      expect(summary.cloned_count).toBe(2);
      expect(summary.source_campaign).toBe('Tech CTOs');
      expect(summary.target_campaign).toBe('Marketing VPs');
    });

    it('should handle empty workflows', () => {
      const summary = WorkflowCloner.generateCloneSummary([], []);

      expect(summary.source_count).toBe(0);
      expect(summary.cloned_count).toBe(0);
      expect(summary.source_campaign).toBeNull();
      expect(summary.target_campaign).toBeNull();
    });
  });

  describe('Integration: Complete Clone Flow', () => {
    it('should clone all 7 workflows for a campaign', () => {
      const workflowTypes = [
        'Email Preparation',
        'Research Report',
        'Email 1',
        'Email 2',
        'Email 3',
        'Reply Tracker',
        'Opt-Out',
      ];

      const sourceWorkflows = workflowTypes.map(type => ({
        ...createMockWorkflow('Tech CTOs'),
        name: `${type} - Tech CTOs`,
      }));

      const cloned = WorkflowCloner.cloneMultipleWorkflows(sourceWorkflows, context);

      expect(cloned).toHaveLength(7);
      
      // Verify all are inactive
      cloned.forEach(workflow => {
        expect(workflow.active).toBe(false);
      });

      // Verify all have new campaign name
      cloned.forEach(workflow => {
        expect(workflow.name).toContain('Marketing VPs');
        expect(workflow.name).not.toContain('Tech CTOs');
      });

      // Verify all have no ID
      cloned.forEach(workflow => {
        expect(workflow.id).toBeUndefined();
      });
    });
  });
});
