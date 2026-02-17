/**
 * MOCK GENESIS RPC FUNCTIONS
 * 
 * Provides mock implementations of all Genesis schema RPC functions for testing.
 * Used when SKIP_GENESIS_SCHEMA_CHECK=true to allow tests to run without
 * requiring actual database schema setup.
 * 
 * This module intercepts Supabase RPC calls and returns mock success data
 * matching the expected return structure of each Genesis function.
 * 
 * Features:
 * - Stateful partition tracking (remembers created partitions)
 * - Dynamic partition naming based on workspace_slug
 * - Idempotency simulation (already_exists vs created)
 * - Validation error simulation
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * State management for mock partitions
 */
interface PartitionState {
  workspace_id: string;
  partition_name: string;
  workspace_slug?: string | null;
  status: 'active' | 'dropped';
  created_at: string;
  row_count: number; // Track row count for drop operations
}

// Global state for partition registry
const mockPartitionRegistry = new Map<string, PartitionState>();

/**
 * Resets the mock partition registry (useful for test cleanup)
 */
export function resetMockPartitionRegistry(): void {
  mockPartitionRegistry.clear();
}

/**
 * Generates a partition name from workspace ID and optional slug
 * Truncates to 63 characters to comply with PostgreSQL identifier limits
 */
function generatePartitionName(workspaceId: string, workspaceSlug?: string | null): string {
  let partitionName: string;
  
  if (workspaceSlug) {
    // Sanitize slug: replace non-alphanumeric with _, collapse multiples
    const sanitized = workspaceSlug.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // If slug is numeric only, add 'p_' prefix
    if (/^\d+$/.test(sanitized)) {
      partitionName = `leads_p_p_${sanitized}`;
    } else {
      partitionName = `leads_p_${sanitized}`;
    }
  } else {
    // Use first 8 chars of UUID if no slug
    const uuidPart = workspaceId.replace(/-/g, '_').substring(0, 12);
    partitionName = `leads_p_${uuidPart}`;
  }
  
  // Truncate to PostgreSQL identifier limit (63 chars)
  if (partitionName.length > 63) {
    partitionName = partitionName.substring(0, 63);
  }
  
  return partitionName;
}

/**
 * Mock handler for fn_ignite_workspace_partition
 */
function mockIgniteWorkspacePartition(params: any): any {
  const { p_workspace_id, p_workspace_slug } = params;
  
  // Check if partition already exists
  const existing = mockPartitionRegistry.get(p_workspace_id);
  if (existing && existing.status === 'active') {
    return [{
      success: true,
      partition_name: existing.partition_name,
      operation: 'already_exists',
      duration_ms: 10,
      error_message: null,
    }];
  }
  
  // Create new partition
  const partitionName = generatePartitionName(p_workspace_id, p_workspace_slug);
  mockPartitionRegistry.set(p_workspace_id, {
    workspace_id: p_workspace_id,
    partition_name: partitionName,
    workspace_slug: p_workspace_slug,
    status: 'active',
    created_at: new Date().toISOString(),
    row_count: 0,
  });
  
  return [{
    success: true,
    partition_name: partitionName,
    operation: 'created',
    duration_ms: 150,
    error_message: null,
  }];
}

/**
 * Mock handler for fn_drop_workspace_partition
 */
function mockDropWorkspacePartition(params: any): any {
  const { p_workspace_id, p_force } = params;
  
  const partition = mockPartitionRegistry.get(p_workspace_id);
  if (!partition || partition.status === 'dropped') {
    return [{
      success: false,
      operation: 'not_found',
      row_count: 0,
      error_message: 'Partition not found',
    }];
  }
  
  // Check if has data and not forced
  if (partition.row_count > 0 && !p_force) {
    return [{
      success: false,
      operation: 'has_data',
      row_count: partition.row_count,
      error_message: `Partition has ${partition.row_count} rows. Use force=true to drop.`,
    }];
  }
  
  // Mark as dropped
  partition.status = 'dropped';
  
  return [{
    success: true,
    operation: 'dropped',
    row_count: partition.row_count,
    error_message: null,
  }];
}

/**
 * Mock RPC response handlers
 */
const MOCK_RPC_HANDLERS: Record<string, (params: any) => any> = {
  fn_ignite_workspace_partition: mockIgniteWorkspacePartition,
  fn_drop_workspace_partition: mockDropWorkspacePartition,
  
 // Other RPC functions with static responses
  fn_list_partitions: () => Array.from(mockPartitionRegistry.values()).filter(p => p.status === 'active'),
  
  fn_set_workspace_context: (params: any) => [{
    success: true,
    workspace_id: params.p_workspace_id,
  }],
  
  fn_get_current_workspace_context: (params: any) => [{
    workspace_id: params.p_workspace_id || '00000000-0000-0000-0000-000000000000',
  }],
  
  fn_clear_workspace_context: () => [{ success: true }],
  
  fn_log_audit_event: () => [{
    audit_id: `mock-audit-${Date.now()}`,
    success: true,
  }],
  
  fn_export_workspace_data: () => [{
    export_id: `mock-export-${Date.now()}`,
    success: true,
    row_count: 0,
  }],
  
  fn_delete_workspace: (params: any) => [{
    success: true,
    workspace_id: params.p_workspace_id,
    deleted_at: new Date().toISOString(),
  }],
  
  fn_analyze_deletion_impact: () => [{
    total_rows: 0,
    table_counts: {},
    dependencies: [],
  }],
};

/**
 * Creates a mock Supabase client with intercepted RPC calls
 * 
 * @param realClient - Optional real Supabase client to wrap
 * @returns Mock client with RPC interception
 */
export function createMockSupabaseClient(realClient?: SupabaseClient): any {
  // Track current workspace context (for RLS simulation)
  let currentWorkspaceContext: string | null = null;
  
  const mockRpc = jest.fn((functionName: string, params?: any) => {
    // Handle context management functions
    if (functionName === 'set_workspace_context') {
      currentWorkspaceContext = params?.p_workspace_id || null;
      return Promise.resolve({
        data: null,
        error: null,
      });
    }
    
    if (functionName === 'get_workspace_context') {
      return Promise.resolve({
        data: currentWorkspaceContext || '00000000-0000-0000-0000-000000000000',
        error: null,
      });
    }
    
    // Use custom handler if available
    if (functionName in MOCK_RPC_HANDLERS) {
      return Promise.resolve({
        data: MOCK_RPC_HANDLERS[functionName](params || {}),
        error: null,
      });
    }
    
    // For unknown functions, return generic success
    return Promise.resolve({
      data: [{
        success: true,
        message: `Mock response for ${functionName}`,
      }],
      error: null,
    });
  });
  
  // Create chainable query builder mocks
  const createQueryBuilder = () => {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    return builder;
  };
  
  const mockFrom = jest.fn((table: string) => {
    // Return mock data for known tables
    const queryBuilder = createQueryBuilder();
    
    if (table === 'partition_registry') {
      // Override eq() to capture workspace_id filter
      let workspaceIdFilter: string | null = null;
      
      queryBuilder.eq = jest.fn((column: string, value: any) => {
        if (column === 'workspace_id') {
          workspaceIdFilter = value;
        }
        return queryBuilder;
      });
      
      // Override maybeSingle() to check registry
      queryBuilder.maybeSingle = jest.fn(() => {
        if (workspaceIdFilter) {
          const partition = mockPartitionRegistry.get(workspaceIdFilter);
          if (partition && partition.status === 'active') {
            return Promise.resolve({
              data: {
                workspace_id: partition.workspace_id,
                partition_name: partition.partition_name,
                workspace_slug: partition.workspace_slug,
                status: partition.status,
                created_at: partition.created_at,
              },
              error: null,
            });
          }
        }
        return Promise.resolve({ data: null, error: null });
      });
    }
    
    return queryBuilder;
  });
  
  const mockSchema = jest.fn((schemaName: string) => {
    if (schemaName === 'genesis' || schemaName === 'public') {
      return {
        rpc: mockRpc,
        from: mockFrom,
      };
    }
    return realClient?.schema(schemaName) || { rpc: mockRpc, from: mockFrom };
  });
  
  return {
    schema: mockSchema,
    from: mockFrom,
    rpc: mockRpc,
    auth: realClient?.auth,
    storage: realClient?.storage,
    realtime: realClient?.realtime,
    // Expose mock functions for testing
    __mocks: {
      rpc: mockRpc,
      schema: mockSchema,
      from: mockFrom,
    },
  };
}

/**
 * Adds mock data to a partition (for testing drop with data scenarios)
 */
export function addMockDataToPartition(workspaceId: string, rowCount: number): void {
  const partition = mockPartitionRegistry.get(workspaceId);
  if (partition) {
    partition.row_count = rowCount;
  }
}

/**
 * Registers a custom mock response for a specific RPC function
 * 
 * @param functionName - Name of the RPC function
 * @param handler - Mock handler function
 */
export function registerMockRpcHandler(functionName: string, handler: (params: any) => any): void {
  MOCK_RPC_HANDLERS[functionName] = handler;
}

/**
 * Gets the current mock response for a function
 * 
 * @param functionName - Name of the RPC function
 * @returns Current mock handler function
 */
export function getMockRpcHandler(functionName: string): ((params: any) => any) | undefined {
  return MOCK_RPC_HANDLERS[functionName];
}
