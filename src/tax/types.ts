/**
 * Tax Management System Types
 * 
 * Comprehensive tax handling for legal compliance and financial accuracy
 */

export interface TaxRate {
  id: string;
  name: string;
  displayName: string;
  rate: number; // Decimal format (0.08 = 8%)
  type: TaxType;
  description?: string;
  effectiveDate: string; // ISO date string
  expiryDate?: string; // ISO date string
  isActive: boolean;
  applicableRegions?: string[];
  applicableCategories?: string[];
  jurisdiction: TaxJurisdiction;
}

export type TaxType = 
  | 'sales_tax'      // US State Sales Tax
  | 'vat'            // Value Added Tax (EU, UK, etc.)
  | 'gst'            // Goods and Services Tax (Canada, Australia, etc.)
  | 'excise'         // Excise Tax (alcohol, tobacco, etc.)
  | 'service_tax'    // Service-specific tax
  | 'luxury_tax'     // Luxury goods tax
  | 'environmental'  // Environmental/carbon tax
  | 'local'          // Local municipality tax
  | 'custom';        // Custom tax type

export interface TaxJurisdiction {
  country: string;
  state?: string;
  province?: string;
  county?: string;
  city?: string;
  postalCode?: string;
}

export interface TaxConfiguration {
  id: string;
  name: string;
  description: string;
  rates: TaxRate[];
  exemptions: TaxExemption[];
  rules: TaxRule[];
  roundingRule: TaxRoundingRule;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxExemption {
  id: string;
  name: string;
  type: ExemptionType;
  description: string;
  certificateRequired: boolean;
  validUntil?: string;
  applicableCategories?: string[];
  applicableCustomers?: string[];
  exemptFromTaxTypes: TaxType[];
}

export type ExemptionType = 
  | 'government'     // Government entities
  | 'nonprofit'      // Non-profit organizations
  | 'resale'         // Resale certificate
  | 'export'         // Export sales
  | 'medical'        // Medical exemption
  | 'education'      // Educational institutions
  | 'religious'      // Religious organizations
  | 'agricultural'   // Agricultural exemption
  | 'manufacturing'  // Manufacturing exemption
  | 'custom';        // Custom exemption

export interface TaxRule {
  id: string;
  name: string;
  description: string;
  conditions: TaxRuleCondition[];
  actions: TaxRuleAction[];
  priority: number; // Higher number = higher priority
  isActive: boolean;
}

export interface TaxRuleCondition {
  field: string; // 'product.category', 'customer.type', 'sale.amount', etc.
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
}

export interface TaxRuleAction {
  type: 'apply_rate' | 'exempt' | 'override_rate' | 'add_rate' | 'multiply_rate';
  value?: any;
  taxRateId?: string;
}

export type TaxRoundingRule = 
  | 'round_to_cent'        // Round to nearest cent
  | 'round_up_to_cent'     // Always round up to cent
  | 'round_down_to_cent'   // Always round down to cent
  | 'round_to_nickel'      // Round to nearest 5 cents
  | 'no_rounding';         // No rounding (exact calculation)

export interface TaxCalculationInput {
  items: TaxableItem[];
  customer?: TaxCustomer;
  location?: TaxJurisdiction;
  exemptions?: string[]; // Exemption IDs
  overrides?: TaxOverride[];
}

export interface TaxableItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  taxCategory?: string;
  isTaxIncluded?: boolean; // Price includes tax
  exemptFromTaxTypes?: TaxType[];
}

export interface TaxCustomer {
  id: string;
  type: CustomerType;
  taxExemptionCertificates?: TaxExemptionCertificate[];
  billingAddress?: TaxJurisdiction;
  isBusinessCustomer?: boolean;
}

export type CustomerType = 'individual' | 'business' | 'government' | 'nonprofit' | 'reseller';

export interface TaxExemptionCertificate {
  id: string;
  exemptionId: string;
  certificateNumber: string;
  issuingAuthority: string;
  validFrom: string;
  validUntil?: string;
  isValid: boolean;
}

export interface TaxOverride {
  itemId?: string; // Override for specific item
  taxType?: TaxType; // Override for specific tax type
  action: 'exempt' | 'override_rate' | 'add_rate';
  value?: number;
  reason: string;
  authorizedBy: string;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxBreakdown: TaxBreakdownItem[];
  totalTax: number;
  total: number;
  exemptions: AppliedExemption[];
  warnings: TaxWarning[];
  metadata: TaxCalculationMetadata;
}

export interface TaxBreakdownItem {
  taxRateId: string;
  taxRate: TaxRate;
  taxableAmount: number;
  taxAmount: number;
  appliedToItems: string[]; // Item IDs
}

export interface AppliedExemption {
  exemptionId: string;
  exemption: TaxExemption;
  appliedToItems: string[];
  savedAmount: number;
}

export interface TaxWarning {
  type: 'missing_rate' | 'expired_exemption' | 'invalid_certificate' | 'rule_conflict';
  message: string;
  affectedItems?: string[];
  severity: 'info' | 'warning' | 'error';
}

export interface TaxCalculationMetadata {
  calculatedAt: string;
  configurationId: string;
  rulesApplied: string[];
  jurisdiction: TaxJurisdiction;
  roundingRule: TaxRoundingRule;
  version: string;
  calculationTimeMs?: number;
}

// Event types for tax management
export interface TaxRateCreatedEvent {
  type: 'tax.rate.created';
  payload: {
    taxRate: TaxRate;
    createdBy: string;
  };
  at: number;
  aggregate?: {
    id: string;
    type: 'tax_configuration';
  };
}

export interface TaxRateUpdatedEvent {
  type: 'tax.rate.updated';
  payload: {
    taxRateId: string;
    changes: Partial<TaxRate>;
    previousValues: Partial<TaxRate>;
    updatedBy: string;
  };
  at: number;
  aggregate?: {
    id: string;
    type: 'tax_configuration';
  };
}

export interface TaxCalculationPerformedEvent {
  type: 'tax.calculation.performed';
  payload: {
    input: TaxCalculationInput;
    result: TaxCalculationResult;
    saleId?: string;
  };
  at: number;
  aggregate?: {
    id: string;
    type: 'sale';
  };
}

export interface TaxExemptionAppliedEvent {
  type: 'tax.exemption.applied';
  payload: {
    exemptionId: string;
    customerId: string;
    certificateId?: string;
    appliedToSale: string;
    savedAmount: number;
  };
  at: number;
  aggregate?: {
    id: string;
    type: 'sale';
  };
}

export interface TaxReportGeneratedEvent {
  type: 'tax.report.generated';
  payload: {
    reportId: string;
    reportType: TaxReportType;
    periodStart: string;
    periodEnd: string;
    jurisdiction: TaxJurisdiction;
    generatedBy: string;
    totalTaxCollected: number;
    totalExemptions: number;
  };
  at: number;
  aggregate?: {
    id: string;
    type: 'tax_report';
  };
}

export type TaxReportType = 
  | 'sales_tax_return'
  | 'vat_return'
  | 'tax_summary'
  | 'exemption_report'
  | 'audit_trail';

// Known tax events union
export type TaxEvent = 
  | TaxRateCreatedEvent
  | TaxRateUpdatedEvent
  | TaxCalculationPerformedEvent
  | TaxExemptionAppliedEvent
  | TaxReportGeneratedEvent;
