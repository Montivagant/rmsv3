/**
 * Tax Calculation Engine
 * 
 * Core business logic for calculating taxes with support for:
 * - Multiple tax rates and types
 * - Complex exemption rules
 * - Regional tax jurisdictions
 * - Compliance and audit trails
 */

import type {
  TaxConfiguration,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxBreakdownItem,
  TaxableItem,
  TaxRate,
  TaxRule,
  TaxExemption,
  AppliedExemption,
  TaxWarning,
  TaxRoundingRule,
  TaxJurisdiction,
  TaxCustomer
} from './types';

export class TaxCalculationEngine {
  private configuration: TaxConfiguration;

  constructor(configuration: TaxConfiguration) {
    this.configuration = configuration;
  }

  /**
   * Calculate taxes for a given input
   */
  calculate(input: TaxCalculationInput): TaxCalculationResult {
    const startTime = performance.now();
    
    // Validate input
    this.validateInput(input);

    // Determine effective jurisdiction
    const jurisdiction = this.determineJurisdiction(input);

    // Apply tax rules to determine applicable rates
    const applicableRates = this.determineApplicableRates(input, jurisdiction);

    // Process exemptions
    const { exemptions, exemptItems } = this.processExemptions(input);

    // Calculate taxes for each item
    const taxBreakdown: TaxBreakdownItem[] = [];
    const warnings: TaxWarning[] = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const item of input.items) {
      subtotal += item.price * item.quantity;

      // Skip if item is exempt
      if (exemptItems.has(item.id)) {
        continue;
      }

      // Calculate taxes for this item
      const itemTaxes = this.calculateItemTaxes(item, applicableRates, input);
      
      for (const itemTax of itemTaxes) {
        // Find or create breakdown entry
        let breakdownItem = taxBreakdown.find(b => b.taxRateId === itemTax.taxRateId);
        
        if (!breakdownItem) {
          breakdownItem = {
            taxRateId: itemTax.taxRateId,
            taxRate: itemTax.taxRate,
            taxableAmount: 0,
            taxAmount: 0,
            appliedToItems: []
          };
          taxBreakdown.push(breakdownItem);
        }

        breakdownItem.taxableAmount += itemTax.taxableAmount;
        breakdownItem.taxAmount += itemTax.taxAmount;
        breakdownItem.appliedToItems.push(item.id);
        
        totalTax += itemTax.taxAmount;
      }
    }

    // Apply rounding rules
    totalTax = this.applyRounding(totalTax, this.configuration.roundingRule);
    
    // Update breakdown with rounded amounts
    taxBreakdown.forEach(breakdown => {
      breakdown.taxAmount = this.applyRounding(breakdown.taxAmount, this.configuration.roundingRule);
    });

    const total = subtotal + totalTax;
    const calculationTime = performance.now() - startTime;

    return {
      subtotal,
      taxBreakdown,
      totalTax,
      total,
      exemptions,
      warnings,
      metadata: {
        calculatedAt: new Date().toISOString(),
        configurationId: this.configuration.id,
        rulesApplied: this.getAppliedRuleIds(input),
        jurisdiction,
        roundingRule: this.configuration.roundingRule,
        version: '1.0.0'
      }
    };
  }

  /**
   * Validate calculation input
   */
  private validateInput(input: TaxCalculationInput): void {
    if (!input.items || input.items.length === 0) {
      throw new Error('At least one item is required for tax calculation');
    }

    for (const item of input.items) {
      if (!item.id || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        throw new Error(`Invalid item data: ${item.id}`);
      }
      
      if (item.price < 0 || item.quantity < 0) {
        throw new Error(`Negative values not allowed for item: ${item.id}`);
      }
    }
  }

  /**
   * Determine effective tax jurisdiction
   */
  private determineJurisdiction(input: TaxCalculationInput): TaxJurisdiction {
    // Priority: input location > customer billing address > default
    return input.location || 
           input.customer?.billingAddress || 
           { country: 'US', state: 'CA' }; // Default jurisdiction
  }

  /**
   * Determine applicable tax rates based on rules and jurisdiction
   */
  private determineApplicableRates(input: TaxCalculationInput, jurisdiction: TaxJurisdiction): TaxRate[] {
    let applicableRates = this.configuration.rates.filter(rate => {
      // Filter by active status
      if (!rate.isActive) return false;

      // Filter by effective/expiry dates
      const now = Date.now();
      const effectiveDate = new Date(rate.effectiveDate).getTime();
      const expiryDate = rate.expiryDate ? new Date(rate.expiryDate).getTime() : Infinity;
      
      if (now < effectiveDate || now > expiryDate) return false;

      // Filter by jurisdiction
      if (rate.applicableRegions && rate.applicableRegions.length > 0) {
        const jurisdictionMatch = this.matchesJurisdiction(jurisdiction, rate.applicableRegions);
        if (!jurisdictionMatch) return false;
      }

      return true;
    });

    // Apply tax rules to modify rates
    const sortedRules = [...this.configuration.rules]
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRuleConditions(rule, input, jurisdiction)) {
        applicableRates = this.applyRuleActions(rule, applicableRates, input);
      }
    }

    return applicableRates;
  }

  /**
   * Check if jurisdiction matches applicable regions
   */
  private matchesJurisdiction(jurisdiction: TaxJurisdiction, applicableRegions: string[]): boolean {
    const jurisdictionString = [
      jurisdiction.country,
      jurisdiction.state,
      jurisdiction.province,
      jurisdiction.county,
      jurisdiction.city,
      jurisdiction.postalCode
    ].filter(Boolean).join('-').toLowerCase();

    return applicableRegions.some(region => 
      jurisdictionString.includes(region.toLowerCase())
    );
  }

  /**
   * Process tax exemptions
   */
  private processExemptions(input: TaxCalculationInput): { 
    exemptions: AppliedExemption[], 
    exemptItems: Set<string> 
  } {
    const exemptions: AppliedExemption[] = [];
    const exemptItems = new Set<string>();

    if (!input.exemptions || input.exemptions.length === 0) {
      return { exemptions, exemptItems };
    }

    for (const exemptionId of input.exemptions) {
      const exemption = this.configuration.exemptions.find(e => e.id === exemptionId);
      
      if (!exemption) {
        continue;
      }

      // Validate exemption certificate if required
      if (exemption.certificateRequired && input.customer) {
        const validCertificate = input.customer.taxExemptionCertificates?.find(cert => 
          cert.exemptionId === exemptionId && cert.isValid &&
          (!cert.validUntil || new Date(cert.validUntil) > new Date())
        );

        if (!validCertificate) {
          continue;
        }
      }

      // Determine which items this exemption applies to
      const applicableItems = input.items.filter(item => {
        // Check category restrictions
        if (exemption.applicableCategories && exemption.applicableCategories.length > 0) {
          return exemption.applicableCategories.includes(item.category || '');
        }

        // Check customer restrictions
        if (exemption.applicableCustomers && exemption.applicableCustomers.length > 0 && input.customer) {
          return exemption.applicableCustomers.includes(input.customer.id);
        }

        return true;
      });

      if (applicableItems.length > 0) {
        exemptions.push({
          exemptionId: exemption.id,
          exemption,
          appliedToItems: applicableItems.map(item => item.id),
          savedAmount: 0 // Will be calculated later
        });

        // Mark items as exempt
        applicableItems.forEach(item => exemptItems.add(item.id));
      }
    }

    return { exemptions, exemptItems };
  }

  /**
   * Calculate taxes for a single item
   */
  private calculateItemTaxes(
    item: TaxableItem, 
    applicableRates: TaxRate[], 
    input: TaxCalculationInput
  ): Array<{ taxRateId: string, taxRate: TaxRate, taxableAmount: number, taxAmount: number }> {
    const itemTaxes = [];
    const itemAmount = item.price * item.quantity;

    for (const rate of applicableRates) {
      // Check if this tax rate applies to this item
      if (rate.applicableCategories && rate.applicableCategories.length > 0) {
        if (!rate.applicableCategories.includes(item.category || '')) {
          continue;
        }
      }

      // Check if item is exempt from this tax type
      if (item.exemptFromTaxTypes && item.exemptFromTaxTypes.includes(rate.type)) {
        continue;
      }

      // Calculate tax amount
      let taxableAmount = itemAmount;
      let taxAmount: number;

      if (item.isTaxIncluded) {
        // Tax is included in price - extract it
        taxAmount = (taxableAmount * rate.rate) / (1 + rate.rate);
        taxableAmount = taxableAmount - taxAmount;
      } else {
        // Tax is additional to price
        taxAmount = taxableAmount * rate.rate;
      }

      itemTaxes.push({
        taxRateId: rate.id,
        taxRate: rate,
        taxableAmount,
        taxAmount
      });
    }

    return itemTaxes;
  }

  /**
   * Evaluate tax rule conditions
   */
  private evaluateRuleConditions(rule: TaxRule, input: TaxCalculationInput, jurisdiction: TaxJurisdiction): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, input, jurisdiction);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  /**
   * Get field value for rule evaluation
   */
  private getFieldValue(field: string, input: TaxCalculationInput, jurisdiction: TaxJurisdiction): any {
    const parts = field.split('.');
    
    switch (parts[0]) {
      case 'customer':
        return this.getNestedValue(input.customer, parts.slice(1));
      case 'jurisdiction':
        return this.getNestedValue(jurisdiction, parts.slice(1));
      case 'sale':
        if (parts[1] === 'amount') {
          return input.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        }
        break;
      case 'items':
        if (parts[1] === 'count') {
          return input.items.length;
        }
        break;
    }

    return undefined;
  }

  /**
   * Get nested object value
   */
  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'greater_than':
        return fieldValue > conditionValue;
      case 'less_than':
        return fieldValue < conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Apply rule actions to modify tax rates
   */
  private applyRuleActions(rule: TaxRule, rates: TaxRate[], input: TaxCalculationInput): TaxRate[] {
    let modifiedRates = [...rates];

    for (const action of rule.actions) {
      switch (action.type) {
        case 'exempt':
          // Remove all rates (full exemption)
          modifiedRates = [];
          break;
        
        case 'apply_rate':
          if (action.taxRateId) {
            const rateToApply = this.configuration.rates.find(r => r.id === action.taxRateId);
            if (rateToApply && !modifiedRates.find(r => r.id === action.taxRateId)) {
              modifiedRates.push(rateToApply);
            }
          }
          break;
        
        case 'override_rate':
          if (action.taxRateId && typeof action.value === 'number') {
            const rateIndex = modifiedRates.findIndex(r => r.id === action.taxRateId);
            if (rateIndex >= 0) {
              modifiedRates[rateIndex] = {
                ...modifiedRates[rateIndex],
                rate: action.value
              };
            }
          }
          break;
      }
    }

    return modifiedRates;
  }

  /**
   * Apply rounding rules to tax amount
   */
  private applyRounding(amount: number, roundingRule: TaxRoundingRule): number {
    switch (roundingRule) {
      case 'round_to_cent':
        return Math.round(amount * 100) / 100;
      
      case 'round_up_to_cent':
        return Math.ceil(amount * 100) / 100;
      
      case 'round_down_to_cent':
        return Math.floor(amount * 100) / 100;
      
      case 'round_to_nickel':
        return Math.round(amount * 20) / 20;
      
      case 'no_rounding':
      default:
        return amount;
    }
  }

  /**
   * Get IDs of rules that were applied
   */
  private getAppliedRuleIds(input: TaxCalculationInput): string[] {
    const jurisdiction = this.determineJurisdiction(input);
    
    return this.configuration.rules
      .filter(rule => rule.isActive && this.evaluateRuleConditions(rule, input, jurisdiction))
      .map(rule => rule.id);
  }

  /**
   * Update configuration
   */
  updateConfiguration(configuration: TaxConfiguration): void {
    this.configuration = configuration;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): TaxConfiguration {
    return { ...this.configuration };
  }
}
