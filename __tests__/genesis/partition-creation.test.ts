/**
 * PARTITION CREATION TESTS
 * 
 * Tests for partition creation functionality:
 * - Basic partition creation
 * - Idempotency (calling twice doesn't error)
 * - Concurrent partition creation (race conditions)
 * - Partition naming with special characters
 * - Partition drop with safety checks
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import {
  createTestSupabaseClient,
  generateTestWorkspaceId,
  generateTestWorkspaceSlug,
  cleanupTestPartitions,
  setupTestEnvironment,
  sleep,
} from './setup.test';
import {
  createPartition,
  partitionExists,
  dropPartition,
  type CreatePartitionResult,
} from '@/lib/genesis/partition-manager';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Partition Creation', () => {
  let supabaseClient: SupabaseClient;
  const testWorkspaceIds: string[] = [];

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    supabaseClient = setup.supabaseClient;
  });

  afterEach(async () => {
    // Clean up test partitions after each test
    if (testWorkspaceIds.length > 0) {
      await cleanupTestPartitions(supabaseClient, testWorkspaceIds);
      testWorkspaceIds.length = 0; // Clear array
    }
  });

  describe('Basic Partition Creation', () => {
    it('should create a partition successfully', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      expect(result.partitionName).toMatch(/^leads_p_/);
      expect(result.operation).toBe('created');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it('should create partition with workspace slug', async () => {
      const workspaceId = generateTestWorkspaceId();
      const workspaceSlug = generateTestWorkspaceSlug('my-workspace');
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        workspaceSlug,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      expect(result.partitionName).toContain('my_workspace');
      expect(result.operation).toBe('created');
    });

    it('should verify partition exists after creation', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Create partition
      const createResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(createResult.success).toBe(true);

      // Verify it exists
      const existsResult = await partitionExists({
        workspaceId,
        supabaseClient,
      });

      expect(existsResult.exists).toBe(true);
      expect(existsResult.partitionName).toBe(createResult.partitionName);
      expect(existsResult.registryEntry).toBeTruthy();
      expect(existsResult.registryEntry?.workspace_id).toBe(workspaceId);
      expect(existsResult.registryEntry?.status).toBe('active');
    });
  });

  describe('Idempotency', () => {
    it('should be idempotent - calling twice returns already_exists', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // First call - should create
      const firstResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(firstResult.success).toBe(true);
      expect(firstResult.operation).toBe('created');

      // Second call - should return already_exists
      const secondResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(secondResult.success).toBe(true);
      expect(secondResult.operation).toBe('already_exists');
      expect(secondResult.partitionName).toBe(firstResult.partitionName);
    });

    it('should handle multiple rapid calls gracefully', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Make 5 rapid calls
      const results = await Promise.all([
        createPartition({ workspaceId, supabaseClient }),
        createPartition({ workspaceId, supabaseClient }),
        createPartition({ workspaceId, supabaseClient }),
        createPartition({ workspaceId, supabaseClient }),
        createPartition({ workspaceId, supabaseClient }),
      ]);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // At least one should be 'created', others can be 'already_exists' or 'created_by_other'
      const operations = results.map((r) => r.operation);
      expect(operations).toContain('created');
      
      // All should have the same partition name
      const partitionNames = results.map((r) => r.partitionName).filter(Boolean);
      expect(new Set(partitionNames).size).toBe(1); // All should be the same
    });
  });

  describe('Concurrent Partition Creation', () => {
    it('should handle concurrent creation attempts without conflicts', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Start 10 concurrent partition creation attempts
      const promises = Array.from({ length: 10 }, () =>
        createPartition({ workspaceId, supabaseClient })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
      });

      // Verify partition exists
      const existsResult = await partitionExists({
        workspaceId,
        supabaseClient,
      });
      expect(existsResult.exists).toBe(true);
    });

    it('should handle race conditions with created_by_other operation', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Create partition in one transaction
      const firstPromise = createPartition({ workspaceId, supabaseClient });

      // Immediately try to create again (should hit race condition)
      await sleep(10); // Small delay to increase chance of race condition
      const secondPromise = createPartition({ workspaceId, supabaseClient });

      const [firstResult, secondResult] = await Promise.all([
        firstPromise,
        secondPromise,
      ]);

      // Both should succeed
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);

      // One should be 'created', the other could be 'already_exists' or 'created_by_other'
      const operations = [firstResult.operation, secondResult.operation];
      expect(operations).toContain('created');
      
      // Both should reference the same partition
      expect(firstResult.partitionName).toBe(secondResult.partitionName);
    });
  });

  describe('Partition Naming', () => {
    it('should sanitize special characters in workspace slug', async () => {
      const workspaceId = generateTestWorkspaceId();
      const workspaceSlug = 'test-workspace@#$%^&*()';
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        workspaceSlug,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      // Should sanitize special characters
      expect(result.partitionName).toMatch(/^leads_p_test_workspace/);
      expect(result.partitionName).not.toContain('@');
      expect(result.partitionName).not.toContain('#');
      expect(result.partitionName).not.toContain('$');
    });

    it('should handle numeric-only slugs', async () => {
      const workspaceId = generateTestWorkspaceId();
      const workspaceSlug = '12345';
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        workspaceSlug,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      // Should prepend 'p_' if slug starts with number
      expect(result.partitionName).toMatch(/^leads_p_p_/);
    });

    it('should handle very long workspace slugs', async () => {
      const workspaceId = generateTestWorkspaceId();
      const longSlug = 'a'.repeat(100); // Very long slug
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        workspaceSlug: longSlug,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      // Should truncate to valid length (max 63 chars for Postgres identifier)
      expect(result.partitionName!.length).toBeLessThanOrEqual(63);
    });

    it('should use UUID when slug is not provided', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      const result = await createPartition({
        workspaceId,
        supabaseClient,
      });

      expect(result.success).toBe(true);
      expect(result.partitionName).toBeTruthy();
      // Should use UUID (with dashes replaced by underscores)
      expect(result.partitionName).toMatch(/^leads_p_[0-9a-f_]+$/);
    });
  });

  describe('Partition Drop', () => {
    it('should drop empty partition successfully', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Create partition
      const createResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(createResult.success).toBe(true);

      // Drop partition (should succeed since it's empty)
      const dropResult = await dropPartition({
        workspaceId,
        force: false,
        supabaseClient,
      });

      expect(dropResult.success).toBe(true);
      expect(dropResult.operation).toBe('dropped');
      expect(dropResult.rowCount).toBe(0);
      expect(dropResult.error).toBeNull();

      // Verify partition no longer exists
      const existsResult = await partitionExists({
        workspaceId,
        supabaseClient,
      });
      expect(existsResult.exists).toBe(false);

      // Remove from cleanup list since we already dropped it
      testWorkspaceIds.pop();
    });

    it('should prevent dropping partition with data without force flag', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Create partition
      const createResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(createResult.success).toBe(true);

      // Insert test data
      const { error: insertError } = await supabaseClient
        .from('genesis.leads')
        .insert({
          workspace_id: workspaceId,
          email_address: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(insertError).toBeNull();

      // Try to drop without force (should fail)
      const dropResult = await dropPartition({
        workspaceId,
        force: false,
        supabaseClient,
      });

      expect(dropResult.success).toBe(false);
      expect(dropResult.operation).toBe('has_data');
      expect(dropResult.rowCount).toBeGreaterThan(0);
      expect(dropResult.error).toContain('rows');

      // Verify partition still exists
      const existsResult = await partitionExists({
        workspaceId,
        supabaseClient,
      });
      expect(existsResult.exists).toBe(true);
    });

    it('should drop partition with data when force flag is set', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      // Create partition
      const createResult = await createPartition({
        workspaceId,
        supabaseClient,
      });
      expect(createResult.success).toBe(true);

      // Insert test data
      const { error: insertError } = await supabaseClient
        .from('genesis.leads')
        .insert({
          workspace_id: workspaceId,
          email_address: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(insertError).toBeNull();

      // Drop with force (should succeed)
      const dropResult = await dropPartition({
        workspaceId,
        force: true,
        supabaseClient,
      });

      expect(dropResult.success).toBe(true);
      expect(dropResult.operation).toBe('dropped');
      expect(dropResult.rowCount).toBeGreaterThan(0);

      // Verify partition no longer exists
      const existsResult = await partitionExists({
        workspaceId,
        supabaseClient,
      });
      expect(existsResult.exists).toBe(false);

      // Remove from cleanup list since we already dropped it
      testWorkspaceIds.pop();
    });

    it('should handle dropping non-existent partition gracefully', async () => {
      const workspaceId = generateTestWorkspaceId();
      // Don't add to testWorkspaceIds - partition doesn't exist

      const dropResult = await dropPartition({
        workspaceId,
        force: false,
        supabaseClient,
      });

      expect(dropResult.success).toBe(false);
      expect(dropResult.operation).toBe('not_found');
      expect(dropResult.error).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid workspace ID format', async () => {
      const result = await createPartition({
        workspaceId: 'invalid-uuid',
        supabaseClient,
      });

      expect(result.success).toBe(false);
      expect(result.operation).toBe('failed');
      expect(result.error).toBeTruthy();
    });

    it('should handle null workspace ID', async () => {
      const result = await createPartition({
        workspaceId: null as any,
        supabaseClient,
      });

      expect(result.success).toBe(false);
      expect(result.operation).toBe('failed');
      expect(result.error).toBeTruthy();
    });

    it('should handle empty workspace ID', async () => {
      const result = await createPartition({
        workspaceId: '',
        supabaseClient,
      });

      expect(result.success).toBe(false);
      expect(result.operation).toBe('failed');
      expect(result.error).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should create partition in under 500ms', async () => {
      const workspaceId = generateTestWorkspaceId();
      testWorkspaceIds.push(workspaceId);

      const startTime = Date.now();
      const result = await createPartition({
        workspaceId,
        supabaseClient,
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeLessThan(500);
      expect(duration).toBeLessThan(500);
    });
  });
});
