/**
 * GENESIS PART VI - PHASE 61.C: N8N WORKFLOW CAMPAIGN INTEGRATION
 * Workflow Namer Tests
 */

import { WorkflowNamer } from '@/lib/genesis/phase61c/workflow-namer';
import type { WorkflowType } from '@/lib/genesis/phase61c/workflow-types';

describe('WorkflowNamer', () => {
  describe('generateName', () => {
    it('should generate correct workflow name', () => {
      const name = WorkflowNamer.generateName('email_1', 'Tech CTOs');
      expect(name).toBe('Email 1 - Tech CTOs');
    });

    it('should generate names for all workflow types', () => {
      const types: WorkflowType[] = [
        'email_preparation',
        'research_report',
        'email_1',
        'email_2',
        'email_3',
        'reply_tracker',
        'opt_out',
      ];

      types.forEach(type => {
        const name = WorkflowNamer.generateName(type, 'Test Campaign');
        expect(name).toContain(' - Test Campaign');
      });
    });

    it('should handle campaign names with special characters', () => {
      const name = WorkflowNamer.generateName('email_1', 'Tech & Marketing (US)');
      expect(name).toBe('Email 1 - Tech & Marketing (US)');
    });
  });

  describe('generateAllNames', () => {
    it('should generate all 7 workflow names', () => {
      const names = WorkflowNamer.generateAllNames('Tech CTOs');
      
      expect(Object.keys(names)).toHaveLength(7);
      expect(names.email_preparation).toBe('Email Preparation - Tech CTOs');
      expect(names.email_1).toBe('Email 1 - Tech CTOs');
      expect(names.email_2).toBe('Email 2 - Tech CTOs');
      expect(names.email_3).toBe('Email 3 - Tech CTOs');
      expect(names.research_report).toBe('Research Report - Tech CTOs');
      expect(names.reply_tracker).toBe('Reply Tracker - Tech CTOs');
      expect(names.opt_out).toBe('Opt-Out - Tech CTOs');
    });
  });

  describe('parseCampaignName', () => {
    it('should parse campaign name from workflow name', () => {
      const campaign = WorkflowNamer.parseCampaignName('Email 1 - Tech CTOs');
      expect(campaign).toBe('Tech CTOs');
    });

    it('should handle campaign names with hyphens', () => {
      const campaign = WorkflowNamer.parseCampaignName('Email 1 - E-commerce - US');
      expect(campaign).toBe('E-commerce - US');
    });

    it('should return null for invalid format', () => {
      const campaign = WorkflowNamer.parseCampaignName('Invalid Name');
      expect(campaign).toBeNull();
    });

    it('should return null for empty string', () => {
      const campaign = WorkflowNamer.parseCampaignName('');
      expect(campaign).toBeNull();
    });
  });

  describe('parseWorkflowType', () => {
    it('should parse workflow type from name', () => {
      const type = WorkflowNamer.parseWorkflowType('Email 1 - Tech CTOs');
      expect(type).toBe('email_1');
    });

    it('should parse all workflow types', () => {
      const tests = [
        { name: 'Email Preparation - Test', expected: 'email_preparation' },
        { name: 'Research Report - Test', expected: 'research_report' },
        { name: 'Email 1 - Test', expected: 'email_1' },
        { name: 'Email 2 - Test', expected: 'email_2' },
        { name: 'Email 3 - Test', expected: 'email_3' },
        { name: 'Reply Tracker - Test', expected: 'reply_tracker' },
        { name: 'Opt-Out - Test', expected: 'opt_out' },
      ];

      tests.forEach(test => {
        const type = WorkflowNamer.parseWorkflowType(test.name);
        expect(type).toBe(test.expected);
      });
    });

    it('should return null for invalid workflow type', () => {
      const type = WorkflowNamer.parseWorkflowType('Invalid Type - Campaign');
      expect(type).toBeNull();
    });
  });

  describe('isValidFormat', () => {
    it('should validate correct format', () => {
      expect(WorkflowNamer.isValidFormat('Email 1 - Tech CTOs')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(WorkflowNamer.isValidFormat('Invalid')).toBe(false);
      expect(WorkflowNamer.isValidFormat('Email 1')).toBe(false);
      expect(WorkflowNamer.isValidFormat('Unknown Type - Campaign')).toBe(false);
    });

    it('should validate all generated names', () => {
      const names = WorkflowNamer.generateAllNames('Test Campaign');
      Object.values(names).forEach(name => {
        expect(WorkflowNamer.isValidFormat(name)).toBe(true);
      });
    });
  });

  describe('replaceCampaignName', () => {
    it('should replace campaign name', () => {
      const result = WorkflowNamer.replaceCampaignName(
        'Email 1 - Tech CTOs',
        'Tech CTOs',
        'Marketing VPs'
      );
      expect(result).toBe('Email 1 - Marketing VPs');
    });

    it('should replace based on separator-delimited match', () => {
      // Note: The function replaces " - {oldCampaign}" pattern
      // So "Tech" will match " - Tech" in " - Tech CTOs"
      const result = WorkflowNamer.replaceCampaignName(
        'Email 1 - Tech CTOs',
        'Tech',
        'Marketing'
      );
      expect(result).toBe('Email 1 - Marketing CTOs');
    });

    it('should replace campaign names with special characters', () => {
      const result = WorkflowNamer.replaceCampaignName(
        'Email 1 - Tech & Marketing',
        'Tech & Marketing',
        'Sales & Support'
      );
      expect(result).toBe('Email 1 - Sales & Support');
    });
  });

  describe('getWorkflowType', () => {
    it('should get workflow type with validation', () => {
      const type = WorkflowNamer.getWorkflowType('Email 1 - Tech CTOs');
      expect(type).toBe('email_1');
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        WorkflowNamer.getWorkflowType('Invalid Name');
      }).toThrow('Invalid workflow name format');
    });
  });

  describe('getCampaignName', () => {
    it('should get campaign name with validation', () => {
      const campaign = WorkflowNamer.getCampaignName('Email 1 - Tech CTOs');
      expect(campaign).toBe('Tech CTOs');
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        WorkflowNamer.getCampaignName('Invalid Name');
      }).toThrow('Invalid workflow name format');
    });
  });

  describe('validateCampaignName', () => {
    it('should validate correct campaign names', () => {
      const result = WorkflowNamer.validateCampaignName('Tech CTOs');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = WorkflowNamer.validateCampaignName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject name that is too short', () => {
      const result = WorkflowNamer.validateCampaignName('AB');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject name that is too long', () => {
      const result = WorkflowNamer.validateCampaignName('A'.repeat(101));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not exceed 100 characters');
    });

    it('should reject invalid characters', () => {
      const result = WorkflowNamer.validateCampaignName('Test@Campaign');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should accept valid special characters', () => {
      const validNames = [
        'Tech & Marketing',
        'E-commerce (US)',
        'Sales_Directors',
      ];

      validNames.forEach(name => {
        const result = WorkflowNamer.validateCampaignName(name);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('filterByCampaign', () => {
    it('should filter workflows by campaign name', () => {
      const workflows = [
        'Email 1 - Tech CTOs',
        'Email 2 - Tech CTOs',
        'Email 1 - Marketing VPs',
        'Email 2 - Marketing VPs',
      ];

      const filtered = WorkflowNamer.filterByCampaign(workflows, 'Tech CTOs');
      
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain('Email 1 - Tech CTOs');
      expect(filtered).toContain('Email 2 - Tech CTOs');
    });

    it('should return empty array if no matches', () => {
      const workflows = [
        'Email 1 - Tech CTOs',
        'Email 2 - Tech CTOs',
      ];

      const filtered = WorkflowNamer.filterByCampaign(workflows, 'Marketing VPs');
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const filtered = WorkflowNamer.filterByCampaign([], 'Tech CTOs');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getDisplayName', () => {
    it('should get display names for all types', () => {
      expect(WorkflowNamer.getDisplayName('email_1')).toBe('Email 1');
      expect(WorkflowNamer.getDisplayName('email_preparation')).toBe('Email Preparation');
      expect(WorkflowNamer.getDisplayName('research_report')).toBe('Research Report');
      expect(WorkflowNamer.getDisplayName('reply_tracker')).toBe('Reply Tracker');
      expect(WorkflowNamer.getDisplayName('opt_out')).toBe('Opt-Out');
    });
  });

  describe('Integration: Complete Workflow', () => {
    it('should handle complete workflow naming lifecycle', () => {
      // Generate names
      const names = WorkflowNamer.generateAllNames('Tech CTOs');
      
      // Validate all names
      Object.values(names).forEach(name => {
        expect(WorkflowNamer.isValidFormat(name)).toBe(true);
      });

      // Parse campaign name from all
      Object.values(names).forEach(name => {
        const campaign = WorkflowNamer.parseCampaignName(name);
        expect(campaign).toBe('Tech CTOs');
      });

      // Replace campaign name in all
      const newNames = Object.values(names).map(name =>
        WorkflowNamer.replaceCampaignName(name, 'Tech CTOs', 'Marketing VPs')
      );

      // Verify replacements
      newNames.forEach(name => {
        const campaign = WorkflowNamer.parseCampaignName(name);
        expect(campaign).toBe('Marketing VPs');
      });
    });
  });
});
