/**
 * Tax Service
 * 
 * High-level service for tax operations with event store integration
 * Provides a clean API for tax calculations and management
 */

import type { EventStore } from '../events/types';
import type {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxConfiguration,
  TaxRate,
  TaxEvent,
  TaxReportType
} from './types';

import { TaxCalculationEngine } from './engine';
import { taxConfigurationManager } from './configuration';

export class TaxService {
  private engine: TaxCalculationEngine | null = null;
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.initializeEngine();
  }

  /**
   * Calculate taxes for a transaction
   */
  async calculateTaxes(input: TaxCalculationInput, saleId?: string): Promise<TaxCalculationResult> {
    if (!this.engine) {
      throw new Error('Tax engine not initialized');
    }

    try {
      const result = this.engine.calculate(input);

      // Log tax calculation event
      await this.eventStore.append('tax.calculation.performed', {
        input,
        result,
        saleId
      }, {
        key: `tax-calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        params: { saleId: saleId || 'unknown' },
        aggregate: saleId ? { id: saleId, type: 'sale' } : undefined
      });

      return result;
    } catch (error) {
      console.error('Tax calculation failed:', error);
      throw new Error(`Tax calculation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get current tax configuration
   */
  getCurrentConfiguration(): TaxConfiguration | null {
    return taxConfigurationManager.getDefaultConfiguration();
  }

  /**
   * Update tax configuration
   */
  async updateConfiguration(configId: string): Promise<boolean> {
    const config = taxConfigurationManager.getConfiguration(configId);
    if (!config) {
      return false;
    }

    this.engine = new TaxCalculationEngine(config);
    return true;
  }

  /**
   * Create a new tax rate
   */
  async createTaxRate(
    configId: string,
    taxRate: Omit<TaxRate, 'id'>,
    createdBy: string
  ): Promise<string | null> {
    const fullTaxRate: TaxRate = {
      ...taxRate,
      id: this.generateId()
    };

    const success = taxConfigurationManager.addTaxRate(configId, fullTaxRate);
    if (!success) {
      return null;
    }

    // Log tax rate creation event
    await this.eventStore.append('tax.rate.created', {
      taxRate: fullTaxRate,
      createdBy
    }, {
      key: `tax-rate-created-${fullTaxRate.id}`,
      params: { taxRateId: fullTaxRate.id },
      aggregate: { id: configId, type: 'tax_configuration' }
    });

    // Reinitialize engine with updated configuration
    await this.updateConfiguration(configId);

    return fullTaxRate.id;
  }

  /**
   * Update an existing tax rate
   */
  async updateTaxRate(
    configId: string,
    rateId: string,
    updates: Partial<TaxRate>,
    updatedBy: string
  ): Promise<boolean> {
    const config = taxConfigurationManager.getConfiguration(configId);
    if (!config) {
      return false;
    }

    const existingRate = config.rates.find(r => r.id === rateId);
    if (!existingRate) {
      return false;
    }

    // Store previous values for audit
    const previousValues: Partial<TaxRate> = {};
    Object.keys(updates).forEach(key => {
      previousValues[key as keyof TaxRate] = existingRate[key as keyof TaxRate] as any;
    });

    const success = taxConfigurationManager.updateTaxRate(configId, rateId, updates);
    if (!success) {
      return false;
    }

    // Log tax rate update event
    await this.eventStore.append('tax.rate.updated', {
      taxRateId: rateId,
      changes: updates,
      previousValues,
      updatedBy
    }, {
      key: `tax-rate-updated-${rateId}-${Date.now()}`,
      params: { taxRateId: rateId },
      aggregate: { id: configId, type: 'tax_configuration' }
    });

    // Reinitialize engine with updated configuration
    await this.updateConfiguration(configId);

    return true;
  }

  /**
   * Apply tax exemption to a customer transaction
   */
  async applyExemption(
    exemptionId: string,
    customerId: string,
    saleId: string,
    certificateId?: string
  ): Promise<boolean> {
    const config = this.getCurrentConfiguration();
    if (!config) {
      return false;
    }

    const exemption = config.exemptions.find(e => e.id === exemptionId);
    if (!exemption) {
      return false;
    }

    // Calculate saved amount (this would typically be done as part of a sale calculation)
    const savedAmount = 0; // TODO: Calculate actual saved amount

    // Log exemption application event
    await this.eventStore.append('tax.exemption.applied', {
      exemptionId,
      customerId,
      certificateId,
      appliedToSale: saleId,
      savedAmount
    }, {
      key: `tax-exemption-${exemptionId}-${saleId}`,
      params: { exemptionId, customerId, saleId },
      aggregate: { id: saleId, type: 'sale' }
    });

    return true;
  }

  /**
   * Generate tax report
   */
  async generateTaxReport(
    reportType: TaxReportType,
    periodStart: string,
    periodEnd: string,
    generatedBy: string
  ): Promise<string> {
    const reportId = this.generateId();
    const config = this.getCurrentConfiguration();
    
    if (!config) {
      throw new Error('No tax configuration available');
    }

    // Get all tax calculation events in the period
    const events = this.eventStore.getAll();
    const taxEvents = events.filter(event => 
      event.type === 'tax.calculation.performed' &&
      event.at >= new Date(periodStart).getTime() &&
      event.at <= new Date(periodEnd).getTime()
    );

    // Calculate totals
    let totalTaxCollected = 0;
    let totalExemptions = 0;

    for (const event of taxEvents) {
      if (event.type === 'tax.calculation.performed') {
        totalTaxCollected += event.payload.result.totalTax;
        totalExemptions += event.payload.result.exemptions.reduce(
          (sum, exemption) => sum + exemption.savedAmount, 0
        );
      }
    }

    // Log report generation event
    await this.eventStore.append('tax.report.generated', {
      reportId,
      reportType,
      periodStart,
      periodEnd,
      jurisdiction: { country: 'US' }, // TODO: Get from configuration
      generatedBy,
      totalTaxCollected,
      totalExemptions
    }, {
      key: `tax-report-${reportId}`,
      params: { reportId, reportType },
      aggregate: { id: reportId, type: 'tax_report' }
    });

    return reportId;
  }

  /**
   * Get tax calculation history for a specific sale
   */
  getTaxCalculationHistory(saleId: string): TaxEvent[] {
    const events = this.eventStore.getAll();
    return events.filter(event => 
      event.type.startsWith('tax.') &&
      event.aggregate?.id === saleId
    ) as TaxEvent[];
  }

  /**
   * Get tax summary for a date range
   */
  getTaxSummary(startDate: string, endDate: string): {
    totalTaxCollected: number;
    totalExemptions: number;
    transactionCount: number;
    averageTaxPerTransaction: number;
  } {
    const events = this.eventStore.getAll();
    const taxCalculationEvents = events.filter(event => 
      event.type === 'tax.calculation.performed' &&
      event.at >= new Date(startDate).getTime() &&
      event.at <= new Date(endDate).getTime()
    );

    let totalTaxCollected = 0;
    let totalExemptions = 0;
    const transactionCount = taxCalculationEvents.length;

    for (const event of taxCalculationEvents) {
      if (event.type === 'tax.calculation.performed') {
        totalTaxCollected += event.payload.result.totalTax;
        totalExemptions += event.payload.result.exemptions.reduce(
          (sum, exemption) => sum + exemption.savedAmount, 0
        );
      }
    }

    const averageTaxPerTransaction = transactionCount > 0 ? totalTaxCollected / transactionCount : 0;

    return {
      totalTaxCollected,
      totalExemptions,
      transactionCount,
      averageTaxPerTransaction
    };
  }

  /**
   * Validate tax configuration
   */
  validateConfiguration(config: TaxConfiguration): string[] {
    const errors: string[] = [];

    // Check for overlapping tax rates
    const activeSalesTaxRates = config.rates.filter(r => 
      r.isActive && r.type === 'sales_tax' && !r.expiryDate
    );

    if (activeSalesTaxRates.length > 1) {
      errors.push('Multiple active sales tax rates found - this may cause calculation errors');
    }

    // Check for rates without jurisdiction
    const ratesWithoutJurisdiction = config.rates.filter(r => 
      !r.jurisdiction || !r.jurisdiction.country
    );

    if (ratesWithoutJurisdiction.length > 0) {
      errors.push('Some tax rates missing jurisdiction information');
    }

    // Check for exemptions without proper configuration
    const exemptionsRequiringCertificates = config.exemptions.filter(e => 
      e.certificateRequired && !e.validUntil
    );

    if (exemptionsRequiringCertificates.length > 0) {
      errors.push('Some exemptions require certificates but have no expiry date');
    }

    return errors;
  }

  /**
   * Initialize the tax calculation engine
   */
  private initializeEngine(): void {
    const config = taxConfigurationManager.getDefaultConfiguration();
    if (config) {
      this.engine = new TaxCalculationEngine(config);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create tax service instance
 */
export function createTaxService(eventStore: EventStore): TaxService {
  return new TaxService(eventStore);
}
