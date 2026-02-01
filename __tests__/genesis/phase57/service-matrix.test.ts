/**
 * PHASE 57 TESTS: SERVICE MATRIX
 * 
 * Comprehensive tests for service matrix queries and validation
 */

import {
  SERVICE_MATRIX,
  SERVICE_MATRIX_MAP,
  getServiceById,
  queryServiceMatrix,
  getRequiredServices,
  getManagedServices,
  getBYOServices,
  getPerUseServices,
  validateServiceId,
  getServiceDisplayNames,
} from '@/lib/genesis/phase57/service-matrix';
import {
  ServiceCategory,
  CostBearer,
  BillingModel,
  FrictionLevel,
} from '@/lib/genesis/phase57/types';

describe('Phase 57: Service Matrix', () => {
  describe('SERVICE_MATRIX constant', () => {
    test('should contain all expected services', () => {
      expect(SERVICE_MATRIX.length).toBeGreaterThanOrEqual(14);
    });

    test('should have unique service IDs', () => {
      const serviceIds = SERVICE_MATRIX.map((s) => s.serviceId);
      const uniqueIds = new Set(serviceIds);
      expect(uniqueIds.size).toBe(serviceIds.length);
    });

    test('should have valid category for each service', () => {
      const validCategories = Object.values(ServiceCategory);
      for (const service of SERVICE_MATRIX) {
        expect(validCategories).toContain(service.category);
      }
    });

    test('should have valid cost bearer for each service', () => {
      const validBearers = Object.values(CostBearer);
      for (const service of SERVICE_MATRIX) {
        expect(validBearers).toContain(service.costBearer);
      }
    });

    test('should have valid billing model for each service', () => {
      const validModels = Object.values(BillingModel);
      for (const service of SERVICE_MATRIX) {
        expect(validModels).toContain(service.billingModel);
      }
    });

    test('should have valid friction level for each service', () => {
      const validLevels = Object.values(FrictionLevel);
      for (const service of SERVICE_MATRIX) {
        expect(validLevels).toContain(service.frictionLevel);
      }
    });

    test('should have non-empty display names', () => {
      for (const service of SERVICE_MATRIX) {
        expect(service.displayName).toBeTruthy();
        expect(service.displayName.length).toBeGreaterThan(0);
      }
    });

    test('should have non-empty user actions', () => {
      for (const service of SERVICE_MATRIX) {
        expect(service.userAction).toBeTruthy();
        expect(service.userAction.length).toBeGreaterThan(0);
      }
    });

    test('should have non-empty genesis responsibilities', () => {
      for (const service of SERVICE_MATRIX) {
        expect(service.genesisResponsibility).toBeTruthy();
        expect(service.genesisResponsibility.length).toBeGreaterThan(0);
      }
    });

    test('should have cost details for per-use services', () => {
      const perUseServices = SERVICE_MATRIX.filter(
        (s) => s.billingModel === BillingModel.PER_USE
      );
      for (const service of perUseServices) {
        expect(service.costDetails).toBeDefined();
        expect(service.costDetails?.wholesaleCostCents).toBeGreaterThan(0);
        expect(service.costDetails?.retailCostCents).toBeGreaterThan(0);
        expect(service.costDetails?.unit).toBeTruthy();
      }
    });

    test('should have tiers for tiered services', () => {
      const tieredServices = SERVICE_MATRIX.filter(
        (s) => s.billingModel === BillingModel.TIERED
      );
      for (const service of tieredServices) {
        expect(service.costDetails?.tiers).toBeDefined();
        expect(service.costDetails?.tiers?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SERVICE_MATRIX_MAP', () => {
    test('should have same size as array', () => {
      expect(SERVICE_MATRIX_MAP.size).toBe(SERVICE_MATRIX.length);
    });

    test('should allow fast lookup by service ID', () => {
      const gmailService = SERVICE_MATRIX_MAP.get('gmail_oauth');
      expect(gmailService).toBeDefined();
      expect(gmailService?.serviceId).toBe('gmail_oauth');
    });

    test('should return undefined for non-existent service', () => {
      const result = SERVICE_MATRIX_MAP.get('non_existent_service');
      expect(result).toBeUndefined();
    });
  });

  describe('getServiceById', () => {
    test('should return service for valid ID', () => {
      const service = getServiceById('gmail_oauth');
      expect(service).toBeDefined();
      expect(service?.serviceId).toBe('gmail_oauth');
      expect(service?.displayName).toBe('Gmail (OAuth)');
    });

    test('should return undefined for invalid ID', () => {
      const service = getServiceById('invalid_service');
      expect(service).toBeUndefined();
    });

    test('should return OpenAI service', () => {
      const service = getServiceById('openai_byo');
      expect(service).toBeDefined();
      expect(service?.category).toBe(ServiceCategory.BYO_KEY);
    });

    test('should return Apify managed service', () => {
      const service = getServiceById('apify_managed');
      expect(service).toBeDefined();
      expect(service?.category).toBe(ServiceCategory.MANAGED_WHOLESALE);
    });
  });

  describe('queryServiceMatrix', () => {
    test('should return all services with no filters', () => {
      const result = queryServiceMatrix();
      expect(result.length).toBe(SERVICE_MATRIX.length);
    });

    test('should filter by category - managed proxy', () => {
      const result = queryServiceMatrix({
        category: ServiceCategory.MANAGED_PROXY,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.category).toBe(ServiceCategory.MANAGED_PROXY);
      }
    });

    test('should filter by category - managed wholesale', () => {
      const result = queryServiceMatrix({
        category: ServiceCategory.MANAGED_WHOLESALE,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.category).toBe(ServiceCategory.MANAGED_WHOLESALE);
      }
    });

    test('should filter by category - BYO key', () => {
      const result = queryServiceMatrix({
        category: ServiceCategory.BYO_KEY,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.category).toBe(ServiceCategory.BYO_KEY);
      }
    });

    test('should filter by cost bearer - Genesis', () => {
      const result = queryServiceMatrix({
        costBearer: CostBearer.GENESIS,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.costBearer).toBe(CostBearer.GENESIS);
      }
    });

    test('should filter by cost bearer - User Direct', () => {
      const result = queryServiceMatrix({
        costBearer: CostBearer.USER_DIRECT,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.costBearer).toBe(CostBearer.USER_DIRECT);
      }
    });

    test('should filter by billing model - per use', () => {
      const result = queryServiceMatrix({
        billingModel: BillingModel.PER_USE,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.billingModel).toBe(BillingModel.PER_USE);
      }
    });

    test('should filter by required - true', () => {
      const result = queryServiceMatrix({ required: true });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.required).toBe(true);
      }
    });

    test('should filter by required - false', () => {
      const result = queryServiceMatrix({ required: false });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.required).toBe(false);
      }
    });

    test('should filter by friction level - zero', () => {
      const result = queryServiceMatrix({
        frictionLevel: FrictionLevel.ZERO,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.frictionLevel).toBe(FrictionLevel.ZERO);
      }
    });

    test('should combine multiple filters', () => {
      const result = queryServiceMatrix({
        category: ServiceCategory.MANAGED_WHOLESALE,
        billingModel: BillingModel.PER_USE,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.category).toBe(ServiceCategory.MANAGED_WHOLESALE);
        expect(service.billingModel).toBe(BillingModel.PER_USE);
      }
    });

    test('should return empty array if no matches', () => {
      const result = queryServiceMatrix({
        category: ServiceCategory.MANAGED_PROXY,
        billingModel: BillingModel.USER_DIRECT,
      });
      expect(result.length).toBe(0);
    });
  });

  describe('getRequiredServices', () => {
    test('should return only required services', () => {
      const result = getRequiredServices();
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.required).toBe(true);
      }
    });

    test('should include Gmail OAuth', () => {
      const result = getRequiredServices();
      const gmail = result.find((s) => s.serviceId === 'gmail_oauth');
      expect(gmail).toBeDefined();
    });

    test('should include OpenAI', () => {
      const result = getRequiredServices();
      const openai = result.find((s) => s.serviceId === 'openai_byo');
      expect(openai).toBeDefined();
    });

    test('should include Claude', () => {
      const result = getRequiredServices();
      const claude = result.find((s) => s.serviceId === 'claude_byo');
      expect(claude).toBeDefined();
    });
  });

  describe('getManagedServices', () => {
    test('should return managed proxy and wholesale services', () => {
      const result = getManagedServices();
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect([
          ServiceCategory.MANAGED_PROXY,
          ServiceCategory.MANAGED_WHOLESALE,
        ]).toContain(service.category);
      }
    });

    test('should not include BYO services', () => {
      const result = getManagedServices();
      for (const service of result) {
        expect(service.category).not.toBe(ServiceCategory.BYO_KEY);
        expect(service.category).not.toBe(ServiceCategory.BYO_SETUP);
      }
    });

    test('should include Gmail', () => {
      const result = getManagedServices();
      const gmail = result.find((s) => s.serviceId === 'gmail_oauth');
      expect(gmail).toBeDefined();
    });

    test('should include Apify managed', () => {
      const result = getManagedServices();
      const apify = result.find((s) => s.serviceId === 'apify_managed');
      expect(apify).toBeDefined();
    });
  });

  describe('getBYOServices', () => {
    test('should return BYO key and setup services', () => {
      const result = getBYOServices();
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect([
          ServiceCategory.BYO_KEY,
          ServiceCategory.BYO_SETUP,
        ]).toContain(service.category);
      }
    });

    test('should not include managed services', () => {
      const result = getBYOServices();
      for (const service of result) {
        expect(service.category).not.toBe(ServiceCategory.MANAGED_PROXY);
        expect(service.category).not.toBe(ServiceCategory.MANAGED_WHOLESALE);
      }
    });

    test('should include OpenAI', () => {
      const result = getBYOServices();
      const openai = result.find((s) => s.serviceId === 'openai_byo');
      expect(openai).toBeDefined();
    });

    test('should include Calendly', () => {
      const result = getBYOServices();
      const calendly = result.find((s) => s.serviceId === 'calendly_booking');
      expect(calendly).toBeDefined();
    });
  });

  describe('getPerUseServices', () => {
    test('should return only per-use billing services', () => {
      const result = getPerUseServices();
      expect(result.length).toBeGreaterThan(0);
      for (const service of result) {
        expect(service.billingModel).toBe(BillingModel.PER_USE);
      }
    });

    test('should include Apify managed', () => {
      const result = getPerUseServices();
      const apify = result.find((s) => s.serviceId === 'apify_managed');
      expect(apify).toBeDefined();
    });

    test('should include Google CSE', () => {
      const result = getPerUseServices();
      const cse = result.find((s) => s.serviceId === 'google_cse');
      expect(cse).toBeDefined();
    });

    test('should include residential proxies', () => {
      const result = getPerUseServices();
      const proxy = result.find((s) => s.serviceId === 'residential_proxies');
      expect(proxy).toBeDefined();
    });
  });

  describe('validateServiceId', () => {
    test('should return true for valid service ID', () => {
      expect(validateServiceId('gmail_oauth')).toBe(true);
      expect(validateServiceId('openai_byo')).toBe(true);
      expect(validateServiceId('apify_managed')).toBe(true);
    });

    test('should return false for invalid service ID', () => {
      expect(validateServiceId('invalid_service')).toBe(false);
      expect(validateServiceId('')).toBe(false);
      expect(validateServiceId('random_string')).toBe(false);
    });
  });

  describe('getServiceDisplayNames', () => {
    test('should return object with all service names', () => {
      const names = getServiceDisplayNames();
      expect(Object.keys(names).length).toBe(SERVICE_MATRIX.length);
    });

    test('should map service IDs to display names', () => {
      const names = getServiceDisplayNames();
      expect(names['gmail_oauth']).toBe('Gmail (OAuth)');
      expect(names['openai_byo']).toBe('OpenAI');
      expect(names['apify_managed']).toBe('Apify (Managed)');
    });

    test('should have non-empty values', () => {
      const names = getServiceDisplayNames();
      for (const value of Object.values(names)) {
        expect(value).toBeTruthy();
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
