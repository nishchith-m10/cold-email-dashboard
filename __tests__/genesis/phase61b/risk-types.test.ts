/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Risk Types Tests
 */

import {
  calculateRiskLevel,
  shouldNotifyAdmin,
  RISK_SCORES,
  DEFAULT_RISK_THRESHOLDS,
  RiskLevel,
} from '../lib/risk-types';

describe('Risk Types', () => {
  describe('RISK_SCORES constants', () => {
    it('should define disposable email score', () => {
      expect(RISK_SCORES.DISPOSABLE_EMAIL).toBe(50);
    });

    it('should define VPN/proxy score', () => {
      expect(RISK_SCORES.VPN_PROXY).toBe(20);
    });

    it('should define signup frequency abuse score', () => {
      expect(RISK_SCORES.SIGNUP_FREQUENCY_ABUSE).toBe(30);
    });

    it('should define enterprise day one score', () => {
      expect(RISK_SCORES.ENTERPRISE_DAY_ONE).toBe(25);
    });

    it('should define credential validation failure score', () => {
      expect(RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE).toBe(40);
    });

    it('should define region mismatch score', () => {
      expect(RISK_SCORES.REGION_MISMATCH).toBe(15);
    });
  });

  describe('DEFAULT_RISK_THRESHOLDS', () => {
    it('should define low threshold', () => {
      expect(DEFAULT_RISK_THRESHOLDS.low_max).toBe(20);
    });

    it('should define medium threshold', () => {
      expect(DEFAULT_RISK_THRESHOLDS.medium_max).toBe(50);
    });

    it('should define high threshold', () => {
      expect(DEFAULT_RISK_THRESHOLDS.high_min).toBe(51);
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return low for score 0', () => {
      expect(calculateRiskLevel(0)).toBe('low');
    });

    it('should return low for score at low_max threshold', () => {
      expect(calculateRiskLevel(20)).toBe('low');
    });

    it('should return medium for score just above low threshold', () => {
      expect(calculateRiskLevel(21)).toBe('medium');
    });

    it('should return medium for score at medium_max threshold', () => {
      expect(calculateRiskLevel(50)).toBe('medium');
    });

    it('should return high for score just above medium threshold', () => {
      expect(calculateRiskLevel(51)).toBe('high');
    });

    it('should return high for very high scores', () => {
      expect(calculateRiskLevel(100)).toBe('high');
      expect(calculateRiskLevel(200)).toBe('high');
    });

    it('should handle boundary values correctly', () => {
      expect(calculateRiskLevel(19)).toBe('low');
      expect(calculateRiskLevel(20)).toBe('low');
      expect(calculateRiskLevel(21)).toBe('medium');
      expect(calculateRiskLevel(49)).toBe('medium');
      expect(calculateRiskLevel(50)).toBe('medium');
      expect(calculateRiskLevel(51)).toBe('high');
    });

    it('should use custom thresholds when provided', () => {
      const customThresholds = {
        low_max: 10,
        medium_max: 30,
        high_min: 31,
      };

      expect(calculateRiskLevel(10, customThresholds)).toBe('low');
      expect(calculateRiskLevel(11, customThresholds)).toBe('medium');
      expect(calculateRiskLevel(30, customThresholds)).toBe('medium');
      expect(calculateRiskLevel(31, customThresholds)).toBe('high');
    });
  });

  describe('shouldNotifyAdmin', () => {
    it('should not notify for low risk', () => {
      expect(shouldNotifyAdmin('low', 0)).toBe(false);
      expect(shouldNotifyAdmin('low', 20)).toBe(false);
    });

    it('should not notify for medium risk', () => {
      expect(shouldNotifyAdmin('medium', 21)).toBe(false);
      expect(shouldNotifyAdmin('medium', 50)).toBe(false);
    });

    it('should notify for high risk', () => {
      expect(shouldNotifyAdmin('high', 51)).toBe(true);
      expect(shouldNotifyAdmin('high', 100)).toBe(true);
    });

    it('should not notify if score below high threshold despite high level', () => {
      expect(shouldNotifyAdmin('high', 50)).toBe(false);
    });

    it('should use custom thresholds when provided', () => {
      const customThresholds = {
        low_max: 10,
        medium_max: 30,
        high_min: 31,
      };

      expect(shouldNotifyAdmin('high', 31, customThresholds)).toBe(true);
      expect(shouldNotifyAdmin('high', 30, customThresholds)).toBe(false);
    });

    it('should require both high level AND high score', () => {
      expect(shouldNotifyAdmin('medium', 51)).toBe(false);
      expect(shouldNotifyAdmin('low', 51)).toBe(false);
      expect(shouldNotifyAdmin('high', 51)).toBe(true);
    });
  });

  describe('Risk level progression', () => {
    it('should progress monotonically from low to high', () => {
      const levels: RiskLevel[] = [];
      
      for (let score = 0; score <= 100; score += 10) {
        levels.push(calculateRiskLevel(score));
      }

      // Check progression: should not go backwards
      let lastLevel = 'low';
      for (const level of levels) {
        if (lastLevel === 'low') {
          expect(['low', 'medium', 'high']).toContain(level);
        } else if (lastLevel === 'medium') {
          expect(['medium', 'high']).toContain(level);
        } else if (lastLevel === 'high') {
          expect(level).toBe('high');
        }
        lastLevel = level;
      }
    });
  });
});
