/**
 * Tax Configuration Manager
 * 
 * Handles tax rate setup, management, and default configurations
 * for different jurisdictions and business scenarios
 */

import type {
  TaxConfiguration,
  TaxRate,
  TaxExemption,
  TaxRule,
  TaxType,
  TaxJurisdiction,
  ExemptionType,
  TaxRoundingRule
} from './types';

export class TaxConfigurationManager {
  private configurations: Map<string, TaxConfiguration> = new Map();
  private defaultConfigurationId: string | null = null;

  constructor() {
    // Initialize with common default configurations
    this.initializeDefaultConfigurations();
  }

  /**
   * Create a new tax configuration
   */
  createConfiguration(
    name: string,
    description: string,
    rates: TaxRate[] = [],
    exemptions: TaxExemption[] = [],
    rules: TaxRule[] = [],
    roundingRule: TaxRoundingRule = 'round_to_cent'
  ): TaxConfiguration {
    const configuration: TaxConfiguration = {
      id: this.generateId(),
      name,
      description,
      rates: [...rates],
      exemptions: [...exemptions],
      rules: [...rules],
      roundingRule,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configurations.set(configuration.id, configuration);
    return configuration;
  }

  /**
   * Create a tax rate
   */
  createTaxRate(
    name: string,
    displayName: string,
    rate: number,
    type: TaxType,
    jurisdiction: TaxJurisdiction,
    options: {
      description?: string;
      effectiveDate?: string;
      expiryDate?: string;
      applicableRegions?: string[];
      applicableCategories?: string[];
    } = {}
  ): TaxRate {
    return {
      id: this.generateId(),
      name,
      displayName,
      rate,
      type,
      effectiveDate: options.effectiveDate || new Date().toISOString(),
      isActive: true,
      jurisdiction,
      ...(options.description && { description: options.description }),
      ...(options.expiryDate && { expiryDate: options.expiryDate }),
      ...(options.applicableRegions && { applicableRegions: options.applicableRegions }),
      ...(options.applicableCategories && { applicableCategories: options.applicableCategories })
    };
  }

  /**
   * Create a tax exemption
   */
  createTaxExemption(
    name: string,
    type: ExemptionType,
    description: string,
    exemptFromTaxTypes: TaxType[],
    options: {
      certificateRequired?: boolean;
      validUntil?: string;
      applicableCategories?: string[];
      applicableCustomers?: string[];
    } = {}
  ): TaxExemption {
    return {
      id: this.generateId(),
      name,
      type,
      description,
      certificateRequired: options.certificateRequired || false,
      exemptFromTaxTypes,
      ...(options.validUntil && { validUntil: options.validUntil }),
      ...(options.applicableCategories && { applicableCategories: options.applicableCategories }),
      ...(options.applicableCustomers && { applicableCustomers: options.applicableCustomers })
    };
  }

  /**
   * Get configuration by ID
   */
  getConfiguration(id: string): TaxConfiguration | null {
    return this.configurations.get(id) || null;
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration(): TaxConfiguration | null {
    if (this.defaultConfigurationId) {
      return this.getConfiguration(this.defaultConfigurationId);
    }

    // Return first configuration if no default set
    const configs = Array.from(this.configurations.values());
    return configs.length > 0 ? configs[0] : null;
  }

  /**
   * Set default configuration
   */
  setDefaultConfiguration(id: string): boolean {
    const config = this.configurations.get(id);
    if (!config) return false;

    // Remove default flag from current default
    if (this.defaultConfigurationId) {
      const currentDefault = this.configurations.get(this.defaultConfigurationId);
      if (currentDefault) {
        currentDefault.isDefault = false;
        currentDefault.updatedAt = new Date().toISOString();
      }
    }

    // Set new default
    config.isDefault = true;
    config.updatedAt = new Date().toISOString();
    this.defaultConfigurationId = id;

    return true;
  }

  /**
   * Update configuration
   */
  updateConfiguration(id: string, updates: Partial<TaxConfiguration>): boolean {
    const config = this.configurations.get(id);
    if (!config) return false;

    Object.assign(config, updates, {
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Add tax rate to configuration
   */
  addTaxRate(configId: string, taxRate: TaxRate): boolean {
    const config = this.configurations.get(configId);
    if (!config) return false;

    config.rates.push(taxRate);
    config.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Update tax rate
   */
  updateTaxRate(configId: string, rateId: string, updates: Partial<TaxRate>): boolean {
    const config = this.configurations.get(configId);
    if (!config) return false;

    const rateIndex = config.rates.findIndex(r => r.id === rateId);
    if (rateIndex === -1) return false;

    Object.assign(config.rates[rateIndex], updates);
    config.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Remove tax rate
   */
  removeTaxRate(configId: string, rateId: string): boolean {
    const config = this.configurations.get(configId);
    if (!config) return false;

    const rateIndex = config.rates.findIndex(r => r.id === rateId);
    if (rateIndex === -1) return false;

    config.rates.splice(rateIndex, 1);
    config.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * List all configurations
   */
  listConfigurations(): TaxConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Initialize default configurations for common scenarios
   */
  private initializeDefaultConfigurations(): void {
    // US Sales Tax Configuration
    const usSalesTaxConfig = this.createUSConfiguration();
    this.configurations.set(usSalesTaxConfig.id, usSalesTaxConfig);
    this.setDefaultConfiguration(usSalesTaxConfig.id);

    // EU VAT Configuration
    const euVatConfig = this.createEUConfiguration();
    this.configurations.set(euVatConfig.id, euVatConfig);

    // Canada GST/HST Configuration
    const canadaGstConfig = this.createCanadaConfiguration();
    this.configurations.set(canadaGstConfig.id, canadaGstConfig);
  }

  /**
   * Create US Sales Tax configuration
   */
  private createUSConfiguration(): TaxConfiguration {
    const jurisdiction: TaxJurisdiction = { country: 'US', state: 'CA' };

    // California sales tax rates
    const salesTaxRate = this.createTaxRate(
      'ca_sales_tax',
      'California Sales Tax',
      0.0775, // 7.75%
      'sales_tax',
      jurisdiction,
      {
        description: 'California statewide sales tax',
        applicableRegions: ['US-CA']
      }
    );

    // Common exemptions
    const resaleExemption = this.createTaxExemption(
      'resale_exemption',
      'resale',
      'Items purchased for resale',
      ['sales_tax'],
      {
        certificateRequired: true,
        applicableCategories: ['all']
      }
    );

    const nonprofitExemption = this.createTaxExemption(
      'nonprofit_exemption',
      'nonprofit',
      'Non-profit organization exemption',
      ['sales_tax'],
      {
        certificateRequired: true
      }
    );

    return {
      id: this.generateId(),
      name: 'US Sales Tax (California)',
      description: 'Standard US sales tax configuration for California',
      rates: [salesTaxRate],
      exemptions: [resaleExemption, nonprofitExemption],
      rules: [],
      roundingRule: 'round_to_cent',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Create EU VAT configuration
   */
  private createEUConfiguration(): TaxConfiguration {
    const jurisdiction: TaxJurisdiction = { country: 'DE' };

    // German VAT rates
    const standardVat = this.createTaxRate(
      'de_standard_vat',
      'German Standard VAT',
      0.19, // 19%
      'vat',
      jurisdiction,
      {
        description: 'German standard VAT rate',
        applicableRegions: ['DE']
      }
    );

    const reducedVat = this.createTaxRate(
      'de_reduced_vat',
      'German Reduced VAT',
      0.07, // 7%
      'vat',
      jurisdiction,
      {
        description: 'German reduced VAT rate for books, food, etc.',
        applicableRegions: ['DE'],
        applicableCategories: ['books', 'food', 'medical']
      }
    );

    // EU export exemption
    const exportExemption = this.createTaxExemption(
      'eu_export_exemption',
      'export',
      'Export outside EU exemption',
      ['vat'],
      {
        certificateRequired: false
      }
    );

    return {
      id: this.generateId(),
      name: 'EU VAT (Germany)',
      description: 'Standard EU VAT configuration for Germany',
      rates: [standardVat, reducedVat],
      exemptions: [exportExemption],
      rules: [],
      roundingRule: 'round_to_cent',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Create Canada GST/HST configuration
   */
  private createCanadaConfiguration(): TaxConfiguration {
    const jurisdiction: TaxJurisdiction = { country: 'CA', province: 'ON' };

    // Ontario HST
    const hstRate = this.createTaxRate(
      'on_hst',
      'Ontario HST',
      0.13, // 13%
      'gst',
      jurisdiction,
      {
        description: 'Ontario Harmonized Sales Tax',
        applicableRegions: ['CA-ON']
      }
    );

    // Small supplier exemption
    const smallSupplierExemption = this.createTaxExemption(
      'small_supplier_exemption',
      'custom',
      'Small supplier exemption (under $30,000 revenue)',
      ['gst'],
      {
        certificateRequired: false
      }
    );

    return {
      id: this.generateId(),
      name: 'Canada GST/HST (Ontario)',
      description: 'Standard Canadian GST/HST configuration for Ontario',
      rates: [hstRate],
      exemptions: [smallSupplierExemption],
      rules: [],
      roundingRule: 'round_to_cent',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(id: string): string | null {
    const config = this.configurations.get(id);
    return config ? JSON.stringify(config, null, 2) : null;
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(jsonString: string): boolean {
    try {
      const config: TaxConfiguration = JSON.parse(jsonString);
      
      // Validate required fields
      if (!config.id || !config.name || !Array.isArray(config.rates)) {
        return false;
      }

      // Ensure unique ID
      if (this.configurations.has(config.id)) {
        config.id = this.generateId();
      }

      config.updatedAt = new Date().toISOString();
      this.configurations.set(config.id, config);
      
      return true;
    } catch {
      return false;
    }
  }
}

// Global tax configuration manager instance
export const taxConfigurationManager = new TaxConfigurationManager();
