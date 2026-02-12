/**
 * GENESIS PHASE 71: DIAGNOSTIC ENGINE TESTS
 */

import { describe, it, expect } from '@jest/globals';
import { DiagnosticEngine } from '../../../lib/genesis/phase71/diagnostic-engine';
import { ServiceHealth } from '../../../lib/genesis/phase71/types';

function makeService(
  id: string,
  status: 'ok' | 'degraded' | 'error',
  error?: string,
  message?: string,
): ServiceHealth {
  return {
    id,
    name: `Service ${id}`,
    category: 'ai',
    criticalLevel: 'medium',
    status,
    fixPath: '/settings',
    result: {
      status,
      error,
      message,
      checkedAt: new Date().toISOString(),
    },
  };
}

describe('DiagnosticEngine', () => {
  const engine = new DiagnosticEngine();

  it('should return null for healthy services', () => {
    const service = makeService('openai', 'ok');
    expect(engine.getDiagnostic(service)).toBeNull();
  });

  it('should match OpenAI invalid API key pattern', () => {
    const service = makeService('openai', 'error', 'Invalid API key');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('Invalid');
    expect(guide!.severity).toBe('critical');
    expect(guide!.diagnosticSteps.length).toBeGreaterThan(0);
    expect(guide!.serviceId).toBe('openai');
  });

  it('should match OpenAI rate limit pattern', () => {
    const service = makeService('openai', 'degraded', 'Rate limit exceeded');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('Rate limit');
    expect(guide!.severity).toBe('high');
  });

  it('should match Anthropic overloaded pattern', () => {
    const service = makeService('anthropic', 'degraded', 'API overloaded');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('overloaded');
  });

  it('should match Gmail token expired pattern', () => {
    const service = makeService('gmail', 'error', 'OAuth token invalid');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.severity).toBe('critical');
    expect(guide!.impact).toContain('emails');
  });

  it('should match Supabase authentication failure', () => {
    const service = makeService('supabase', 'error', 'Authentication failed');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('authentication');
    expect(guide!.impact).toContain('TOTAL');
  });

  it('should match Redis connection failure', () => {
    const service = makeService('redis', 'error', 'PING failed');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('connection');
  });

  it('should match Apify quota warning', () => {
    const service = makeService('apify', 'degraded', 'Quota nearly exhausted');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toContain('quota');
  });

  it('should match DigitalOcean all unreachable', () => {
    const service = makeService('digitalocean', 'error', 'All DigitalOcean accounts unreachable');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.severity).toBe('critical');
  });

  it('should return generic guide for unknown error pattern', () => {
    const service = makeService('openai', 'error', 'Some weird new error nobody has seen');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.issue).toBe('Some weird new error nobody has seen');
    expect(guide!.diagnosticSteps.length).toBeGreaterThan(0);
  });

  it('should return generic guide for unknown service', () => {
    const service = makeService('unknown_service', 'error', 'Something failed');
    const guide = engine.getDiagnostic(service);

    expect(guide).not.toBeNull();
    expect(guide!.serviceId).toBe('unknown_service');
  });

  it('should sort diagnostics by severity (critical first)', () => {
    const services: ServiceHealth[] = [
      makeService('apify', 'degraded', 'Quota nearly exhausted'),
      makeService('supabase', 'error', 'Authentication failed'),
      makeService('openai', 'error', 'Invalid API key'),
    ];

    // Override criticality for the specific mapping
    services[0].criticalLevel = 'high';
    services[1].criticalLevel = 'critical';
    services[2].criticalLevel = 'critical';

    const guides = engine.getDiagnosticsForReport(services);

    expect(guides.length).toBe(3);
    // Critical first
    expect(guides[0].severity).toBe('critical');
  });

  it('should skip ok services in report diagnostics', () => {
    const services: ServiceHealth[] = [
      makeService('a', 'ok'),
      makeService('supabase', 'error', 'Authentication failed'),
      makeService('c', 'ok'),
    ];

    const guides = engine.getDiagnosticsForReport(services);

    expect(guides.length).toBe(1);
    expect(guides[0].serviceId).toBe('supabase');
  });

  it('should report registered services', () => {
    const services = engine.getRegisteredServices();
    expect(services).toContain('openai');
    expect(services).toContain('supabase');
    expect(services).toContain('redis');
    expect(services).toContain('gmail');
  });

  it('should check if diagnostics exist for a service', () => {
    expect(engine.hasDiagnostics('openai')).toBe(true);
    expect(engine.hasDiagnostics('nonexistent')).toBe(false);
  });
});
