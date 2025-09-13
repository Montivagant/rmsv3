/**
 * Dynamic Forms Component
 * Implements conditional fields, progressive disclosure, and dynamic form generation
 */

import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import type { FormField } from '../forms/SmartForm'
import type { ValidationRule } from '../forms/validation'

// Dynamic field condition types
export type FieldCondition = {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logic?: 'and' | 'or'
}

export type FieldVisibilityRule = {
  conditions: FieldCondition[]
  logic?: 'and' | 'or' // Logic between conditions
}

// Enhanced form field with dynamic capabilities
export interface DynamicFormField extends Omit<FormField, 'visible'> {
  group?: string
  section?: string
  order?: number
  visibilityRules?: FieldVisibilityRule
  validationRules?: ValidationRule[]
  dynamicOptions?: (formData: Record<string, any>) => Promise<{ value: string; label: string }[]>
  dependsOn?: string[] // Fields this field depends on
  triggers?: string[] // Fields that should be re-evaluated when this field changes
}

// Form section for progressive disclosure
export interface FormSection {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  condition?: FieldVisibilityRule
  fields: string[] // Field names in this section
}

// Form wizard step
export interface FormStep {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  fields: string[]
  validation?: (formData: Record<string, any>) => string[] // Return validation errors
  canSkip?: boolean
  condition?: FieldVisibilityRule
}

// Dynamic form configuration
export interface DynamicFormConfig {
  mode?: 'sections' | 'wizard' | 'flat'
  sections?: FormSection[]
  steps?: FormStep[]
  autoSave?: boolean
  autoSaveKey?: string
  onFieldChange?: (fieldName: string, value: any, formData: Record<string, any>) => void
  onSectionToggle?: (sectionId: string, expanded: boolean) => void
  onStepChange?: (stepId: string, stepIndex: number) => void
}

// Utility functions for evaluating conditions
export function evaluateCondition(condition: FieldCondition, formData: Record<string, any>): boolean {
  const fieldValue = formData[condition.field]
  const { operator, value } = condition

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'not_equals':
      return fieldValue !== value
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase())
    case 'greater_than':
      return Number(fieldValue) > Number(value)
    case 'less_than':
      return Number(fieldValue) < Number(value)
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue)
    default:
      return true
  }
}

export function evaluateVisibilityRule(rule: FieldVisibilityRule, formData: Record<string, any>): boolean {
  if (!rule.conditions.length) return true

  const results = rule.conditions.map(condition => evaluateCondition(condition, formData))
  
  return rule.logic === 'or' 
    ? results.some(Boolean)
    : results.every(Boolean)
}

// Dynamic form hook
export function useDynamicForm(
  fields: DynamicFormField[],
  config: DynamicFormConfig = {}
) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [fieldOptions, setFieldOptions] = useState<Record<string, { value: string; label: string }[]>>({})

  // Initialize section states
  useEffect(() => {
    if (config.sections) {
      const initialStates: Record<string, boolean> = {}
      config.sections.forEach(section => {
        initialStates[section.id] = section.defaultExpanded ?? true
      })
      setSectionStates(initialStates)
    }
  }, [config.sections])

  // Get visible fields based on conditions
  const visibleFields = useMemo(() => {
    return fields.filter(field => {
      if (!field.visibilityRules) return true
      return evaluateVisibilityRule(field.visibilityRules, formData)
    }).sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [fields, formData])

  // Get visible sections
  const visibleSections = useMemo(() => {
    if (!config.sections) return []
    
    return config.sections.filter(section => {
      if (!section.condition) return true
      return evaluateVisibilityRule(section.condition, formData)
    })
  }, [config.sections, formData])

  // Get visible steps
  const visibleSteps = useMemo(() => {
    if (!config.steps) return []
    
    return config.steps.filter(step => {
      if (!step.condition) return true
      return evaluateVisibilityRule(step.condition, formData)
    })
  }, [config.steps, formData])

  // Update field value
  const updateFieldValue = async (fieldName: string, value: any) => {
    const newFormData = { ...formData, [fieldName]: value }
    setFormData(newFormData)

    // Trigger field change callback
    config.onFieldChange?.(fieldName, value, newFormData)

    // Update dynamic options for dependent fields
    const field = fields.find(f => f.name === fieldName)
    if (field?.triggers) {
      for (const triggerField of field.triggers) {
        const triggeredField = fields.find(f => f.name === triggerField)
        if (triggeredField?.dynamicOptions) {
          try {
            const options = await triggeredField.dynamicOptions(newFormData)
            setFieldOptions(prev => ({
              ...prev,
              [triggerField]: options
            }))
          } catch (error) {
            console.error(`Failed to load options for field ${triggerField}:`, error)
          }
        }
      }
    }
  }

  // Toggle section
  const toggleSection = (sectionId: string) => {
    setSectionStates(prev => {
      const newExpanded = !prev[sectionId]
      config.onSectionToggle?.(sectionId, newExpanded)
      return {
        ...prev,
        [sectionId]: newExpanded
      }
    })
  }

  // Navigate to step
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < visibleSteps.length) {
      setCurrentStep(stepIndex)
      config.onStepChange?.(visibleSteps[stepIndex].id, stepIndex)
    }
  }

  // Validate current step
  const validateCurrentStep = (): string[] => {
    if (config.mode !== 'wizard' || !visibleSteps[currentStep]) return []
    
    const step = visibleSteps[currentStep]
    if (step.validation) {
      return step.validation(formData)
    }
    
    // Basic validation - check required fields
    const errors: string[] = []
    step.fields.forEach(fieldName => {
      const field = fields.find(f => f.name === fieldName)
      if (field?.required && !formData[fieldName]) {
        errors.push(`${field.label} is required`)
      }
    })
    
    return errors
  }

  return {
    formData,
    visibleFields,
    visibleSections,
    visibleSteps,
    sectionStates,
    currentStep,
    fieldOptions,
    updateFieldValue,
    toggleSection,
    goToStep,
    validateCurrentStep
  }
}

// Progressive Disclosure Section Component
export interface FormSectionProps {
  section: FormSection
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}

export const FormSectionComponent: React.FC<FormSectionProps> = ({
  section,
  isExpanded,
  onToggle,
  children,
  className
}) => {
  return (
    <div className={cn('border border-border border-border rounded-lg', className)}>
      <div
        className={cn(
          'flex items-center justify-between p-4 cursor-pointer hover:bg-surface-secondary transition-colors',
          section.collapsible && 'cursor-pointer'
        )}
        onClick={section.collapsible ? onToggle : undefined}
      >
        <div className="flex items-center space-x-3">
          {section.icon && (
            <div className="flex-shrink-0 text-brand-600 text-brand-400">
              {section.icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              {section.title}
            </h3>
            {section.description && (
              <p className="text-sm text-text-secondary mt-1">
                {section.description}
              </p>
            )}
          </div>
        </div>
        
        {section.collapsible && (
          <svg
            className={cn(
              'w-5 h-5 text-text-tertiary transition-transform duration-200',
              isExpanded ? 'transform rotate-180' : ''
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border border-border pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// Wizard Step Component
export interface WizardStepProps {
  step: FormStep
  stepIndex: number
  totalSteps: number
  isActive: boolean
  isCompleted: boolean
  canNavigate: boolean
  onNavigate: () => void
  children: React.ReactNode
  className?: string
}

export const WizardStep: React.FC<WizardStepProps> = ({
  step,
  stepIndex,
  totalSteps,
  isActive,
  isCompleted,
  canNavigate,
  onNavigate,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Step Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              isCompleted
                ? 'bg-success-600 text-text-inverse'
                : isActive
                ? 'bg-brand-600 text-text-inverse'
                : 'bg-surface-secondary text-text-secondary'
            )}
          >
            {isCompleted ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              stepIndex + 1
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              {step.title}
            </h3>
            {step.description && (
              <p className="text-sm text-text-secondary">
                {step.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex-1 mx-4">
          <div className="h-2 bg-surface-secondary rounded-full">
            <div
              className="h-2 bg-brand rounded-full transition-all duration-300 w-[--progress-width]"
              style={{ ['--progress-width' as any]: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <div className="text-xs text-text-muted mt-1 text-center">
            Step {stepIndex + 1} of {totalSteps}
          </div>
        </div>
      </div>
      
      {/* Step Content */}
      {isActive && (
        <div className="bg-surface rounded-lg border border-border p-6">
          {children}
        </div>
      )}
    </div>
  )
}

// Condition Builder Component (for admin interfaces)
export interface ConditionBuilderProps {
  condition: FieldCondition
  onChange: (condition: FieldCondition) => void
  availableFields: { name: string; label: string; type: string }[]
  className?: string
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  onChange,
  availableFields,
  className
}) => {
  const operatorOptions = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'in', label: 'is one of' },
    { value: 'not_in', label: 'is not one of' },
  ]

  return (
    <div className={cn('flex items-center space-x-2 text-sm', className)}>
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value })}
        className="px-2 py-1 border border-border dark:border-border rounded"
      >
        <option value="">Select field</option>
        {availableFields.map(field => (
          <option key={field.name} value={field.name}>
            {field.label}
          </option>
        ))}
      </select>
      
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as any })}
        className="px-2 py-1 border border-border dark:border-border rounded"
      >
        {operatorOptions.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      
      <input
        type="text"
        value={condition.value}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        placeholder="Value"
        className="px-2 py-1 border border-border dark:border-border rounded flex-1"
      />
    </div>
  )
}

export default {
  useDynamicForm,
  FormSectionComponent,
  WizardStep,
  ConditionBuilder,
  evaluateCondition,
  evaluateVisibilityRule
}

