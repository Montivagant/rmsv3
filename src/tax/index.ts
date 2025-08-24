/**
 * Tax Management Module
 * 
 * Comprehensive tax handling for legal compliance and financial accuracy
 */

// Core tax engine and services
export { TaxCalculationEngine } from './engine';
export { TaxService, createTaxService } from './service';
export { taxConfigurationManager, TaxConfigurationManager } from './configuration';

// React components
export { TaxConfigurationPanel } from './components/TaxConfigurationPanel';

// Types
export type {
  // Core types
  TaxRate,
  TaxExemption,
  TaxConfiguration,
  TaxRule,
  TaxType,
  ExemptionType,
  TaxJurisdiction,
  TaxRoundingRule,
  
  // Calculation types
  TaxCalculationInput,
  TaxCalculationResult,
  TaxableItem,
  TaxCustomer,
  TaxBreakdownItem,
  AppliedExemption,
  TaxWarning,
  TaxCalculationMetadata,
  
  // Event types
  TaxEvent,
  TaxRateCreatedEvent,
  TaxRateUpdatedEvent,
  TaxCalculationPerformedEvent,
  TaxExemptionAppliedEvent,
  TaxReportGeneratedEvent,
  
  // Reporting types
  TaxReportType
} from './types';

/**
 * Initialize tax system with default configuration
 */
export function initializeTaxSystem() {
  // Tax system is initialized automatically via the configuration manager
  // This function is provided for explicit initialization if needed
  return taxConfigurationManager.getDefaultConfiguration();
}

/**
 * Tax calculation utilities
 */
export const TaxUtils = {
  /**
   * Format tax rate as percentage
   */
  formatRate(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
  },

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  },

  /**
   * Calculate effective tax rate for multiple rates
   */
  calculateEffectiveRate(rates: number[]): number {
    return rates.reduce((total, rate) => total + rate, 0);
  },

  /**
   * Validate tax rate (0-100%)
   */
  isValidTaxRate(rate: number): boolean {
    return rate >= 0 && rate <= 1;
  },

  /**
   * Convert percentage to decimal
   */
  percentageToDecimal(percentage: number): number {
    return percentage / 100;
  },

  /**
   * Convert decimal to percentage
   */
  decimalToPercentage(decimal: number): number {
    return decimal * 100;
  }
};
