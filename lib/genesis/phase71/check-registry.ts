/**
 * GENESIS PHASE 71: HEALTH CHECK REGISTRY
 *
 * Central registry for all API health checks. Provides discovery,
 * filtering, and configuration capabilities.
 */

import { HealthCheck, ServiceCategory, CriticalityLevel } from './types';
import { openAIHealthCheck } from './checks/openai';
import { anthropicHealthCheck } from './checks/anthropic';
import { relevanceAIHealthCheck } from './checks/relevance-ai';
import { apifyHealthCheck } from './checks/apify';
import { googleCSEHealthCheck } from './checks/google-cse';
import { gmailHealthCheck } from './checks/gmail';
import { digitalOceanHealthCheck } from './checks/digitalocean';
import { supabaseHealthCheck } from './checks/supabase';
import { redisHealthCheck } from './checks/redis';

/**
 * All registered health checks, ordered by criticality then name.
 */
const ALL_CHECKS: HealthCheck[] = [
  // Infrastructure (critical — system stops without these)
  supabaseHealthCheck,
  redisHealthCheck,
  digitalOceanHealthCheck,

  // Email (critical — core product feature)
  gmailHealthCheck,

  // AI (critical/high — email personalisation depends on these)
  openAIHealthCheck,
  anthropicHealthCheck,
  relevanceAIHealthCheck,

  // Integrations (high/medium — enrichment and scraping)
  apifyHealthCheck,
  googleCSEHealthCheck,
];

export class CheckRegistry {
  private checks: Map<string, HealthCheck> = new Map();

  constructor(checks?: HealthCheck[]) {
    const sourceChecks = checks ?? ALL_CHECKS;
    for (const check of sourceChecks) {
      if (this.checks.has(check.id)) {
        throw new Error(`Duplicate health check id: "${check.id}"`);
      }
      this.checks.set(check.id, check);
    }
  }

  /**
   * Return all registered checks.
   */
  getAll(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * Return only the enabled checks.
   */
  getEnabled(): HealthCheck[] {
    return this.getAll().filter((c) => c.enabled);
  }

  /**
   * Return checks filtered by category.
   */
  getByCategory(category: ServiceCategory): HealthCheck[] {
    return this.getAll().filter((c) => c.category === category);
  }

  /**
   * Return checks filtered by criticality level.
   */
  getByCriticality(level: CriticalityLevel): HealthCheck[] {
    return this.getAll().filter((c) => c.criticalLevel === level);
  }

  /**
   * Return a single check by id or null.
   */
  getById(id: string): HealthCheck | null {
    return this.checks.get(id) ?? null;
  }

  /**
   * Total registered checks.
   */
  get size(): number {
    return this.checks.size;
  }

  /**
   * Register a new check at runtime (e.g. plugin system).
   */
  register(check: HealthCheck): void {
    if (this.checks.has(check.id)) {
      throw new Error(`Check id "${check.id}" already registered`);
    }
    this.checks.set(check.id, check);
  }

  /**
   * Enable or disable a check by id.
   */
  setEnabled(id: string, enabled: boolean): void {
    const check = this.checks.get(id);
    if (!check) {
      throw new Error(`Check id "${id}" not found`);
    }
    check.enabled = enabled;
  }
}

/**
 * Default singleton registry with all built-in checks.
 */
export function createDefaultRegistry(): CheckRegistry {
  return new CheckRegistry();
}
