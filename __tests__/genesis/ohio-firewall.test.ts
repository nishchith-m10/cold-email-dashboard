/**
 * OHIO FIREWALL TESTS
 * 
 * Tests for Ohio Firewall enforcement:
 * - assertIsOhio() with Ohio workspace (passes)
 * - assertIsOhio() with non-Ohio workspace (throws)
 * - assertIsNotOhio() with Ohio workspace (throws)
 * - assertIsNotOhio() with non-Ohio workspace (passes)
 * - getLeadsTable() returns correct table
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  createTestSupabaseClient,
  generateTestWorkspaceId,
  setupTestEnvironment,
} from './setup.test';
import {
  assertIsOhio,
  assertIsNotOhio,
  getLeadsTable,
} from '@/lib/genesis/ohio-firewall';
import { OHIO_WORKSPACE_ID } from '@/lib/genesis/genesis-db-config';

describe('Ohio Firewall', () => {
  let supabaseClient: any;
  let ohioWorkspaceId: string;
  let nonOhioWorkspaceId: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    supabaseClient = setup.supabaseClient;
    ohioWorkspaceId = setup.config.ohioWorkspaceId;
    nonOhioWorkspaceId = generateTestWorkspaceId();
  });

  describe('assertIsOhio', () => {
    it('should pass when workspace is Ohio', () => {
      expect(() => {
        assertIsOhio(ohioWorkspaceId, 'test-context');
      }).not.toThrow();
    });

    it('should throw OHIO_FIREWALL_VIOLATION when workspace is not Ohio', () => {
      expect(() => {
        assertIsOhio(nonOhioWorkspaceId, 'test-context');
      }).toThrow('OHIO_FIREWALL_VIOLATION');
    });

    it('should include context in error message', () => {
      const context = 'my-test-function';
      try {
        assertIsOhio(nonOhioWorkspaceId, context);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(context);
        expect(error.message).toContain('OHIO_FIREWALL_VIOLATION');
      }
    });

    it('should include workspace ID in error message', () => {
      try {
        assertIsOhio(nonOhioWorkspaceId, 'test-context');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(nonOhioWorkspaceId);
      }
    });

    it('should throw Error type', () => {
      try {
        assertIsOhio(nonOhioWorkspaceId, 'test-context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('assertIsNotOhio', () => {
    it('should pass when workspace is not Ohio', () => {
      expect(() => {
        assertIsNotOhio(nonOhioWorkspaceId, 'test-context');
      }).not.toThrow();
    });

    it('should throw V35_FIREWALL_VIOLATION when workspace is Ohio', () => {
      expect(() => {
        assertIsNotOhio(ohioWorkspaceId, 'test-context');
      }).toThrow('V35_FIREWALL_VIOLATION');
    });

    it('should include context in error message', () => {
      const context = 'my-v35-function';
      try {
        assertIsNotOhio(ohioWorkspaceId, context);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(context);
        expect(error.message).toContain('V35_FIREWALL_VIOLATION');
      }
    });

    it('should throw Error type', () => {
      try {
        assertIsNotOhio(ohioWorkspaceId, 'test-context');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getLeadsTable', () => {
    it('should return leads_ohio for Ohio workspace', () => {
      const tableName = getLeadsTable(ohioWorkspaceId);
      expect(tableName).toBe('leads_ohio');
    });

    it('should return genesis.leads for non-Ohio workspace', () => {
      const tableName = getLeadsTable(nonOhioWorkspaceId);
      expect(tableName).toBe('genesis.leads');
    });

    it('should return leads_ohio when workspace ID matches OHIO_WORKSPACE_ID constant', () => {
      const tableName = getLeadsTable(OHIO_WORKSPACE_ID);
      expect(tableName).toBe('leads_ohio');
    });

    it('should return genesis.leads for any other workspace ID', () => {
      const workspaceId1 = generateTestWorkspaceId();
      const workspaceId2 = generateTestWorkspaceId();
      const workspaceId3 = generateTestWorkspaceId();

      expect(getLeadsTable(workspaceId1)).toBe('genesis.leads');
      expect(getLeadsTable(workspaceId2)).toBe('genesis.leads');
      expect(getLeadsTable(workspaceId3)).toBe('genesis.leads');
    });
  });

  describe('Firewall Integration', () => {
    it('should prevent Ohio workspace from accessing V35 infrastructure', () => {
      // This test verifies the firewall prevents Ohio from using V35 code paths
      expect(() => {
        assertIsNotOhio(ohioWorkspaceId, 'v35-api-endpoint');
      }).toThrow('V35_FIREWALL_VIOLATION');
    });

    it('should prevent non-Ohio workspace from accessing legacy infrastructure', () => {
      // This test verifies the firewall prevents new workspaces from using legacy code paths
      expect(() => {
        assertIsOhio(nonOhioWorkspaceId, 'legacy-n8n-client');
      }).toThrow('OHIO_FIREWALL_VIOLATION');
    });

    it('should allow Ohio workspace to access legacy infrastructure', () => {
      expect(() => {
        assertIsOhio(ohioWorkspaceId, 'legacy-n8n-client');
      }).not.toThrow();
    });

    it('should allow non-Ohio workspace to access V35 infrastructure', () => {
      expect(() => {
        assertIsNotOhio(nonOhioWorkspaceId, 'v35-api-endpoint');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string workspace ID', () => {
      expect(() => {
        assertIsOhio('', 'test-context');
      }).toThrow();

      expect(() => {
        assertIsNotOhio('', 'test-context');
      }).not.toThrow(); // Empty string is not Ohio
    });

    it('should handle invalid UUID format', () => {
      const invalidId = 'not-a-uuid';
      
      expect(() => {
        assertIsOhio(invalidId, 'test-context');
      }).toThrow();

      expect(() => {
        assertIsNotOhio(invalidId, 'test-context');
      }).not.toThrow(); // Invalid UUID is not Ohio
    });

    it('should handle null workspace ID', () => {
      expect(() => {
        assertIsOhio(null as any, 'test-context');
      }).toThrow();

      expect(() => {
        assertIsNotOhio(null as any, 'test-context');
      }).not.toThrow(); // Null is not Ohio
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error message for OHIO_FIREWALL_VIOLATION', () => {
      try {
        assertIsOhio(nonOhioWorkspaceId, 'legacy-function');
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('OHIO_FIREWALL_VIOLATION');
        expect(error.message).toContain('legacy-function');
        expect(error.message).toContain('must ONLY be used for the Ohio legacy workspace');
      }
    });

    it('should provide clear error message for V35_FIREWALL_VIOLATION', () => {
      try {
        assertIsNotOhio(ohioWorkspaceId, 'v35-function');
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('V35_FIREWALL_VIOLATION');
        expect(error.message).toContain('v35-function');
        expect(error.message).toContain('must NOT be used for the legacy Ohio workspace');
      }
    });
  });

  describe('Table Name Consistency', () => {
    it('should return consistent table names for same workspace', () => {
      const table1 = getLeadsTable(ohioWorkspaceId);
      const table2 = getLeadsTable(ohioWorkspaceId);
      expect(table1).toBe(table2);
      expect(table1).toBe('leads_ohio');

      const table3 = getLeadsTable(nonOhioWorkspaceId);
      const table4 = getLeadsTable(nonOhioWorkspaceId);
      expect(table3).toBe(table4);
      expect(table3).toBe('genesis.leads');
    });

    it('should return different table names for Ohio vs non-Ohio', () => {
      const ohioTable = getLeadsTable(ohioWorkspaceId);
      const nonOhioTable = getLeadsTable(nonOhioWorkspaceId);
      
      expect(ohioTable).not.toBe(nonOhioTable);
      expect(ohioTable).toBe('leads_ohio');
      expect(nonOhioTable).toBe('genesis.leads');
    });
  });
});
