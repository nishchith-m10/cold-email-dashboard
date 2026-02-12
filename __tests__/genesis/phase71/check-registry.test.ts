/**
 * GENESIS PHASE 71: CHECK REGISTRY TESTS
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CheckRegistry } from '../../../lib/genesis/phase71/check-registry';
import { HealthCheck, HealthCheckResult } from '../../../lib/genesis/phase71/types';

function makeCheck(overrides: Partial<HealthCheck> = {}): HealthCheck {
  const id = overrides.id ?? `check-${Math.random().toString(36).substring(2, 6)}`;
  return {
    id,
    name: overrides.name ?? `Check ${id}`,
    category: overrides.category ?? 'ai',
    criticalLevel: overrides.criticalLevel ?? 'medium',
    fixPath: overrides.fixPath ?? '/settings',
    enabled: overrides.enabled ?? true,
    timeoutMs: overrides.timeoutMs ?? 5000,
    check: overrides.check ?? (async (): Promise<HealthCheckResult> => ({
      status: 'ok',
      checkedAt: new Date().toISOString(),
    })),
  };
}

describe('CheckRegistry', () => {
  it('should register checks from constructor', () => {
    const checks = [makeCheck({ id: 'a' }), makeCheck({ id: 'b' })];
    const registry = new CheckRegistry(checks);

    expect(registry.size).toBe(2);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should throw on duplicate check ids', () => {
    const checks = [makeCheck({ id: 'dup' }), makeCheck({ id: 'dup' })];
    expect(() => new CheckRegistry(checks)).toThrow('Duplicate health check id');
  });

  it('should filter enabled checks', () => {
    const checks = [
      makeCheck({ id: 'a', enabled: true }),
      makeCheck({ id: 'b', enabled: false }),
      makeCheck({ id: 'c', enabled: true }),
    ];
    const registry = new CheckRegistry(checks);

    expect(registry.getEnabled()).toHaveLength(2);
    expect(registry.getEnabled().map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('should filter by category', () => {
    const checks = [
      makeCheck({ id: 'a', category: 'ai' }),
      makeCheck({ id: 'b', category: 'infrastructure' }),
      makeCheck({ id: 'c', category: 'ai' }),
    ];
    const registry = new CheckRegistry(checks);

    expect(registry.getByCategory('ai')).toHaveLength(2);
    expect(registry.getByCategory('infrastructure')).toHaveLength(1);
    expect(registry.getByCategory('email')).toHaveLength(0);
  });

  it('should filter by criticality', () => {
    const checks = [
      makeCheck({ id: 'a', criticalLevel: 'critical' }),
      makeCheck({ id: 'b', criticalLevel: 'low' }),
      makeCheck({ id: 'c', criticalLevel: 'critical' }),
    ];
    const registry = new CheckRegistry(checks);

    expect(registry.getByCriticality('critical')).toHaveLength(2);
    expect(registry.getByCriticality('low')).toHaveLength(1);
  });

  it('should get by id', () => {
    const checks = [makeCheck({ id: 'target', name: 'Target' })];
    const registry = new CheckRegistry(checks);

    expect(registry.getById('target')?.name).toBe('Target');
    expect(registry.getById('nonexistent')).toBeNull();
  });

  it('should register new check at runtime', () => {
    const registry = new CheckRegistry([makeCheck({ id: 'a' })]);
    expect(registry.size).toBe(1);

    registry.register(makeCheck({ id: 'b' }));
    expect(registry.size).toBe(2);
  });

  it('should throw when registering duplicate at runtime', () => {
    const registry = new CheckRegistry([makeCheck({ id: 'a' })]);
    expect(() => registry.register(makeCheck({ id: 'a' }))).toThrow('already registered');
  });

  it('should enable/disable a check', () => {
    const registry = new CheckRegistry([makeCheck({ id: 'a', enabled: true })]);

    registry.setEnabled('a', false);
    expect(registry.getById('a')?.enabled).toBe(false);

    registry.setEnabled('a', true);
    expect(registry.getById('a')?.enabled).toBe(true);
  });

  it('should throw when enabling unknown check', () => {
    const registry = new CheckRegistry([makeCheck({ id: 'a' })]);
    expect(() => registry.setEnabled('missing', true)).toThrow('not found');
  });
});
