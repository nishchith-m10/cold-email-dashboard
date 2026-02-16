/**
 * GENESIS PART VI - PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
 * Campaign Status Machine Tests
 */

import { CampaignStatusMachine } from '@/lib/genesis/phase61b/campaign-status-machine';
import type { CampaignStatus } from '@/lib/genesis/phase61b/campaign-types';

describe('CampaignStatusMachine', () => {
  describe('isValidTransition', () => {
    it('should allow draft to pending_leads', () => {
      expect(CampaignStatusMachine.isValidTransition('draft', 'pending_leads')).toBe(true);
    });

    it('should allow pending_leads to pending_personalization', () => {
      expect(CampaignStatusMachine.isValidTransition('pending_leads', 'pending_personalization')).toBe(true);
    });

    it('should allow pending_personalization to ready', () => {
      expect(CampaignStatusMachine.isValidTransition('pending_personalization', 'ready')).toBe(true);
    });

    it('should allow ready to active', () => {
      expect(CampaignStatusMachine.isValidTransition('ready', 'active')).toBe(true);
    });

    it('should allow active to paused', () => {
      expect(CampaignStatusMachine.isValidTransition('active', 'paused')).toBe(true);
    });

    it('should allow active to completed', () => {
      expect(CampaignStatusMachine.isValidTransition('active', 'completed')).toBe(true);
    });

    it('should allow paused to active (resume)', () => {
      expect(CampaignStatusMachine.isValidTransition('paused', 'active')).toBe(true);
    });

    it('should allow backward transition: pending_leads to draft', () => {
      expect(CampaignStatusMachine.isValidTransition('pending_leads', 'draft')).toBe(true);
    });

    it('should reject invalid transition: draft to active', () => {
      expect(CampaignStatusMachine.isValidTransition('draft', 'active')).toBe(false);
    });

    it('should reject transition from completed', () => {
      expect(CampaignStatusMachine.isValidTransition('completed', 'active')).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      expect(CampaignStatusMachine.isValidTransition(null as any, 'active')).toBe(false);
      expect(CampaignStatusMachine.isValidTransition('draft', null as any)).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('should return valid next statuses for draft', () => {
      const next = CampaignStatusMachine.getNextStatuses('draft');
      expect(next).toEqual(['pending_leads']);
    });

    it('should return multiple options for pending_leads', () => {
      const next = CampaignStatusMachine.getNextStatuses('pending_leads');
      expect(next).toContain('pending_personalization');
      expect(next).toContain('draft');
    });

    it('should return multiple options for active', () => {
      const next = CampaignStatusMachine.getNextStatuses('active');
      expect(next).toContain('paused');
      expect(next).toContain('completed');
    });

    it('should return empty array for completed (terminal)', () => {
      const next = CampaignStatusMachine.getNextStatuses('completed');
      expect(next).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('should identify completed as terminal', () => {
      expect(CampaignStatusMachine.isTerminalStatus('completed')).toBe(true);
    });

    it('should identify non-terminal statuses', () => {
      const nonTerminal: CampaignStatus[] = [
        'draft',
        'pending_leads',
        'pending_personalization',
        'ready',
        'active',
        'paused',
      ];

      nonTerminal.forEach(status => {
        expect(CampaignStatusMachine.isTerminalStatus(status)).toBe(false);
      });
    });
  });

  describe('transition', () => {
    it('should succeed for valid transition', () => {
      const result = CampaignStatusMachine.transition('draft', 'pending_leads');
      
      expect(result.success).toBe(true);
      expect(result.transition).toBeDefined();
      expect(result.transition?.from_status).toBe('draft');
      expect(result.transition?.to_status).toBe('pending_leads');
      expect(result.transition?.timestamp).toBeInstanceOf(Date);
    });

    it('should include reason if provided', () => {
      const result = CampaignStatusMachine.transition('active', 'paused', 'Manual pause');
      
      expect(result.success).toBe(true);
      expect(result.transition?.reason).toBe('Manual pause');
    });

    it('should fail for invalid transition', () => {
      const result = CampaignStatusMachine.transition('draft', 'completed');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid transition');
      expect(result.transition).toBeUndefined();
    });

    it('should include allowed transitions in error message', () => {
      const result = CampaignStatusMachine.transition('draft', 'active');
      
      expect(result.error).toContain('Allowed');
      expect(result.error).toContain('pending_leads');
    });
  });

  describe('Campaign Action Checks', () => {
    it('canLaunch should only allow from ready status', () => {
      expect(CampaignStatusMachine.canLaunch('ready')).toBe(true);
      expect(CampaignStatusMachine.canLaunch('draft')).toBe(false);
      expect(CampaignStatusMachine.canLaunch('active')).toBe(false);
    });

    it('canPause should only allow from active status', () => {
      expect(CampaignStatusMachine.canPause('active')).toBe(true);
      expect(CampaignStatusMachine.canPause('draft')).toBe(false);
      expect(CampaignStatusMachine.canPause('paused')).toBe(false);
    });

    it('canResume should only allow from paused status', () => {
      expect(CampaignStatusMachine.canResume('paused')).toBe(true);
      expect(CampaignStatusMachine.canResume('active')).toBe(false);
      expect(CampaignStatusMachine.canResume('draft')).toBe(false);
    });

    it('canComplete should allow from active or paused', () => {
      expect(CampaignStatusMachine.canComplete('active')).toBe(true);
      expect(CampaignStatusMachine.canComplete('paused')).toBe(true);
      expect(CampaignStatusMachine.canComplete('draft')).toBe(false);
      expect(CampaignStatusMachine.canComplete('ready')).toBe(false);
    });
  });

  describe('getStatusDescription', () => {
    it('should return descriptions for all statuses', () => {
      const statuses: CampaignStatus[] = [
        'draft',
        'pending_leads',
        'pending_personalization',
        'ready',
        'active',
        'paused',
        'completed',
      ];

      statuses.forEach(status => {
        const description = CampaignStatusMachine.getStatusDescription(status);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should provide meaningful descriptions', () => {
      expect(CampaignStatusMachine.getStatusDescription('draft')).toContain('no leads');
      expect(CampaignStatusMachine.getStatusDescription('active')).toContain('running');
      expect(CampaignStatusMachine.getStatusDescription('completed')).toContain('finished');
    });
  });

  describe('getNextAction', () => {
    it('should return actions for all statuses', () => {
      const statuses: CampaignStatus[] = [
        'draft',
        'pending_leads',
        'pending_personalization',
        'ready',
        'active',
        'paused',
        'completed',
      ];

      statuses.forEach(status => {
        const action = CampaignStatusMachine.getNextAction(status);
        expect(action).toBeDefined();
        expect(action.length).toBeGreaterThan(0);
      });
    });

    it('should provide actionable next steps', () => {
      expect(CampaignStatusMachine.getNextAction('draft')).toContain('Import');
      expect(CampaignStatusMachine.getNextAction('ready')).toContain('Launch');
      expect(CampaignStatusMachine.getNextAction('paused')).toContain('Resume');
    });
  });

  describe('isValidStatus', () => {
    it('should validate all defined statuses', () => {
      const validStatuses = [
        'draft',
        'pending_leads',
        'pending_personalization',
        'ready',
        'active',
        'paused',
        'completed',
      ];

      validStatuses.forEach(status => {
        expect(CampaignStatusMachine.isValidStatus(status)).toBe(true);
      });
    });

    it('should reject invalid statuses', () => {
      expect(CampaignStatusMachine.isValidStatus('invalid')).toBe(false);
      expect(CampaignStatusMachine.isValidStatus('running')).toBe(false);
      expect(CampaignStatusMachine.isValidStatus('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(CampaignStatusMachine.isValidStatus('DRAFT')).toBe(false);
      expect(CampaignStatusMachine.isValidStatus('Active')).toBe(false);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0% for draft', () => {
      expect(CampaignStatusMachine.getProgressPercentage('draft')).toBe(0);
    });

    it('should return 100% for completed', () => {
      expect(CampaignStatusMachine.getProgressPercentage('completed')).toBe(100);
    });

    it('should show progressive percentages', () => {
      expect(CampaignStatusMachine.getProgressPercentage('draft')).toBe(0);
      expect(CampaignStatusMachine.getProgressPercentage('pending_leads')).toBe(20);
      expect(CampaignStatusMachine.getProgressPercentage('pending_personalization')).toBe(40);
      expect(CampaignStatusMachine.getProgressPercentage('ready')).toBe(60);
      expect(CampaignStatusMachine.getProgressPercentage('active')).toBe(80);
      expect(CampaignStatusMachine.getProgressPercentage('completed')).toBe(100);
    });

    it('should treat paused same as active', () => {
      expect(CampaignStatusMachine.getProgressPercentage('paused')).toBe(
        CampaignStatusMachine.getProgressPercentage('active')
      );
    });

    it('should be monotonically increasing', () => {
      const sequence: CampaignStatus[] = [
        'draft',
        'pending_leads',
        'pending_personalization',
        'ready',
        'active',
        'completed',
      ];

      for (let i = 1; i < sequence.length; i++) {
        const prevProgress = CampaignStatusMachine.getProgressPercentage(sequence[i - 1]);
        const currentProgress = CampaignStatusMachine.getProgressPercentage(sequence[i]);
        expect(currentProgress).toBeGreaterThanOrEqual(prevProgress);
      }
    });
  });
});
