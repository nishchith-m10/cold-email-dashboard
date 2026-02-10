/**
 * GENESIS PHASE 70: FAILOVER DETECTOR
 *
 * Regional outage detection, heartbeat monitoring, and failover
 * trigger evaluation for automated disaster recovery.
 */

import {
  FailoverTrigger,
  FailoverTriggerType,
  HeartbeatStatus,
  FailoverEvent,
  DisasterRecoveryEnvironment,
  DR_DEFAULTS,
  generateEventId,
  getBackupRegion,
  type DORegion,
} from './types';

export class FailoverDetectorError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FailoverDetectorError';
  }
}

export class FailoverDetector {
  private triggers: Map<DORegion, FailoverTrigger[]> = new Map();
  private lastHeartbeatCheck: Map<DORegion, number> = new Map();

  constructor(private readonly env: DisasterRecoveryEnvironment) {}

  // ============================================
  // TRIGGER MANAGEMENT
  // ============================================

  addTrigger(region: DORegion, trigger: FailoverTrigger): void {
    const existing = this.triggers.get(region) || [];
    existing.push(trigger);
    this.triggers.set(region, existing);
  }

  getTriggers(region: DORegion): FailoverTrigger[] {
    return this.triggers.get(region) || [];
  }

  clearTriggers(region: DORegion): void {
    this.triggers.delete(region);
  }

  // ============================================
  // HEARTBEAT MONITORING
  // ============================================

  async checkHeartbeats(region: DORegion): Promise<HeartbeatStatus> {
    const status = await this.env.getHeartbeatStatus(region);
    this.lastHeartbeatCheck.set(region, Date.now());
    return status;
  }

  async evaluateHeartbeatTrigger(region: DORegion): Promise<{
    triggered: boolean;
    status: HeartbeatStatus;
    threshold?: number;
  }> {
    const status = await this.checkHeartbeats(region);
    const triggers = this.getTriggers(region);
    const heartbeatTrigger = triggers.find(t => t.type === 'heartbeat_threshold');

    if (!heartbeatTrigger || !heartbeatTrigger.threshold) {
      return { triggered: false, status };
    }

    const missingPercentage = (status.missingHeartbeats / status.totalDroplets) * 100;
    const triggered = missingPercentage >= heartbeatTrigger.threshold;

    return { triggered, status, threshold: heartbeatTrigger.threshold };
  }

  // ============================================
  // FAILOVER DETECTION
  // ============================================

  async detectFailover(region: DORegion): Promise<{
    shouldFailover: boolean;
    trigger?: FailoverTriggerType;
    reason?: string;
  }> {
    const triggers = this.getTriggers(region);
    const heartbeatEval = await this.evaluateHeartbeatTrigger(region);
    
    if (heartbeatEval.triggered) {
      const autoTrigger = triggers.find(
        t => t.type === 'heartbeat_threshold' && t.autoInitiate,
      );
      if (autoTrigger) {
        return {
          shouldFailover: true,
          trigger: 'heartbeat_threshold',
          reason: `${heartbeatEval.status.missingHeartbeats}/${heartbeatEval.status.totalDroplets} droplets missing`,
        };
      }
    }

    return { shouldFailover: false };
  }

  async declareFailover(region: DORegion, reason: string): Promise<FailoverEvent> {
    const targetRegion = getBackupRegion(region);
    const droplets = await this.env.listDropletsByRegion(region);

    const event: Omit<FailoverEvent, 'eventId' | 'timestamp'> = {
      trigger: 'manual_declaration',
      sourceRegion: region,
      targetRegion,
      affectedTenants: droplets.length,
      autoInitiated: false,
    };

    await this.env.logEvent(event);

    return {
      ...event,
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
    };
  }

  async monitorAllRegions(): Promise<
    Array<{
      region: DORegion;
      shouldFailover: boolean;
      trigger?: FailoverTriggerType;
      reason?: string;
    }>
  > {
    const regions: DORegion[] = ['nyc1', 'sfo1', 'fra1', 'lon1', 'sgp1'];
    const results: Array<{
      region: DORegion;
      shouldFailover: boolean;
      trigger?: FailoverTriggerType;
      reason?: string;
    }> = [];

    for (const region of regions) {
      const detection = await this.detectFailover(region);
      results.push({ region, ...detection });
    }

    return results;
  }

  async checkAndAutoFailover(region: DORegion): Promise<FailoverEvent | null> {
    const detection = await this.detectFailover(region);

    if (!detection.shouldFailover || !detection.trigger) {
      return null;
    }

    const triggers = this.getTriggers(region);
    const trigger = triggers.find(t => t.type === detection.trigger && t.autoInitiate);

    if (!trigger) {
      return null;
    }

    const targetRegion = getBackupRegion(region);
    const droplets = await this.env.listDropletsByRegion(region);

    const event: Omit<FailoverEvent, 'eventId' | 'timestamp'> = {
      trigger: detection.trigger,
      sourceRegion: region,
      targetRegion,
      affectedTenants: droplets.length,
      autoInitiated: true,
    };

    await this.env.logEvent(event);

    return {
      ...event,
      eventId: generateEventId(),
      timestamp: new Date().toISOString(),
    };
  }

  getTimeSinceLastCheck(region: DORegion): number {
    const lastCheck = this.lastHeartbeatCheck.get(region);
    if (!lastCheck) return Infinity;
    return Date.now() - lastCheck;
  }

  isCheckStale(region: DORegion): boolean {
    return this.getTimeSinceLastCheck(region) > DR_DEFAULTS.HEARTBEAT_CHECK_INTERVAL_MS * 2;
  }
}
