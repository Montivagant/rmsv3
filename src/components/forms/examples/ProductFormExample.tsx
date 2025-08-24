/**
 * Product Form Example
 * Demonstrates the enhanced validation framework with cross-field validation
 */

import React from 'react'
import { SmartForm, type FormField } from '../SmartForm'
import { validationRules, crossFieldRules, restaurantCrossFieldRules } from '../validation'
import { createMockValidationServices } from '../businessRules'

// Mock validation services for demo
const validationServices = createMockValidationServices()

export const ProductFormExample: React.FC = () => {
  const handleSubmit = async (values: Record<string, any>) => {
    console.log('Product form submitted:', values)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    alert('Product saved successfully!')
  }

  const handleCancel = () => {
    console.log('Form cancelled')
  }

  // Define form fields with cross-field validation
  const formFields: FormField[] = [
    {
      name: 'sku',
      label: 'Product SKU',
      type: 'sku',
      required: true,
      inputMask: 'sku',
      placeholder: 'e.g., BURGER-001',
      helpText: 'Unique product identifier (uppercase letters, numbers, and hyphens only)',
      validationRules: [
        validationRules.required('SKU is required'),
        validationRules.minLength(3, 'SKU must be at least 3 characters'),
        validationRules.maxLength(20, 'SKU must be no more than 20 characters'),
        validationRules.pattern(/^[A-Z0-9-]+$/, 'SKU can only contain uppercase letters, numbers, and hyphens'),
        validationRules.unique(
          (sku) => validationServices.checkSkuUniqueness(sku as string),
          'SKU already exists. Please choose a different SKU.'
        ),
      ],
    },
    {
      name: 'name',
      label: 'Product Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Classic Cheeseburger',
      validationRules: [
        validationRules.required('Product name is required'),
        validationRules.minLength(2, 'Product name must be at least 2 characters'),
        validationRules.maxLength(100, 'Product name must be no more than 100 characters'),
      ],
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: [
        { value: 'main-course', label: 'Main Course' },
        { value: 'appetizers', label: 'Appetizers' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'sides', label: 'Sides' },
      ],
      validationRules: [
        validationRules.required('Please select a category'),
      ],
    },
    {
      name: 'costPrice',
      label: 'Cost Price',
      type: 'currency',
      inputMask: 'currency',
      formatter: 'currency',
      placeholder: '0.00',
      helpText: 'Cost to make this product',
      validationRules: [
        validationRules.pattern(/^\d+(\.\d{1,2})?$/, 'Please enter a valid price'),
      ],
    },
    {
      name: 'sellingPrice',
      label: 'Selling Price',
      type: 'currency',
      required: true,
      inputMask: 'currency',
      formatter: 'currency',
      placeholder: '0.00',
      helpText: 'Price customers pay for this product',
      validationRules: [
        validationRules.required('Selling price is required'),
        validationRules.pattern(/^\d+(\.\d{1,2})?$/, 'Please enter a valid price'),
        restaurantCrossFieldRules.profitMargin(),
        crossFieldRules.priceRange('costPrice', 50, 500), // Warn if price is too different from cost
      ],
      dependencies: ['costPrice'],
    },
    {
      name: 'preparationTime',
      label: 'Preparation Time (minutes)',
      type: 'number',
      placeholder: '15',
      helpText: 'Time needed to prepare this item',
      validationRules: [
        validationRules.pattern(/^\d+$/, 'Please enter a valid number'),
        restaurantCrossFieldRules.preparationTime(),
      ],
      dependencies: ['category'],
    },
    {
      name: 'quantity',
      label: 'Initial Stock',
      type: 'number',
      inputMask: 'quantity',
      placeholder: '0',
      helpText: 'Starting inventory quantity',
      validationRules: [
        validationRules.pattern(/^\d+$/, 'Quantity must be a whole number'),
      ],
    },
    {
      name: 'lowStockThreshold',
      label: 'Low Stock Alert',
      type: 'number',
      inputMask: 'quantity',
      placeholder: '5',
      helpText: 'Alert when stock falls below this level',
      validationRules: [
        validationRules.pattern(/^\d+$/, 'Threshold must be a whole number'),
        crossFieldRules.lowStockThreshold('quantity'),
      ],
      dependencies: ['quantity'],
    },
    {
      name: 'maxStock',
      label: 'Maximum Stock',
      type: 'number',
      inputMask: 'quantity',
      placeholder: '100',
      helpText: 'Maximum inventory level',
      validationRules: [
        validationRules.pattern(/^\d+$/, 'Maximum stock must be a whole number'),
      ],
    },
    {
      name: 'reorderPoint',
      label: 'Reorder Point',
      type: 'number',
      inputMask: 'quantity',
      placeholder: '10',
      helpText: 'Reorder when stock reaches this level',
      validationRules: [
        validationRules.pattern(/^\d+$/, 'Reorder point must be a whole number'),
        restaurantCrossFieldRules.reorderLogic(),
      ],
      dependencies: ['maxStock'],
    },
    {
      name: 'taxRate',
      label: 'Tax Rate (%)',
      type: 'number',
      inputMask: 'percentage',
      formatter: 'percentage',
      placeholder: '8.25',
      helpText: 'Tax rate as percentage (e.g., 8.25 for 8.25%)',
      validationRules: [
        validationRules.pattern(/^\d+(\.\d{1,2})?$/, 'Please enter a valid percentage'),
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Detailed description of the product...',
      helpText: 'Optional detailed description for customers',
      validationRules: [
        validationRules.maxLength(500, 'Description must be no more than 500 characters'),
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Add New Product
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This form demonstrates the enhanced validation framework with real-time validation, 
          cross-field validation, business rules, and input masks.
        </p>
      </div>

      <SmartForm
        fields={formFields}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Save Product"
        cancelLabel="Cancel"
        autoSave={true}
        autoSaveKey="product-form"
        title="Product Information"
        description="Fill in the details for the new product. All fields with * are required."
      >
        {/* Additional custom content can go here */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 Validation Features Demo
          </h3>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Real-time validation with debouncing</li>
            <li>• Cross-field validation (e.g., selling price vs cost price)</li>
            <li>• Business rules (e.g., SKU uniqueness, prep time by category)</li>
            <li>• Input masks (currency, SKU formatting)</li>
            <li>• Auto-save with draft recovery</li>
            <li>• Accessibility features (ARIA labels, keyboard shortcuts)</li>
          </ul>
        </div>
      </SmartForm>
    </div>
  )
}

export default ProductFormExample