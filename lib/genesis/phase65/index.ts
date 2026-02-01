/**
 * PHASE 65: Friction-Reduction Protocols
 * 
 * Exports for Phase 65.1 (Brand Metadata Scraper) and 65.3 (Calendly Validator)
 */

// Phase 65.1: Brand Metadata Scraper
export { BrandMetadataScraper } from './brand-metadata-scraper';
export type { BrandMetadata, MetadataFetchOptions } from './brand-metadata-scraper';

// Phase 65.3: Calendly Link Validator
export { CalendlyValidator } from './calendly-validator';
export type {
  CalendlyValidationResult,
  ValidationOptions,
} from './calendly-validator';
