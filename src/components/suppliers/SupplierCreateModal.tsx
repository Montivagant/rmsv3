import { useState, useCallback } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useToast } from '../../hooks/useToast';

import type { 
  SupplierFormData, 
  SupplierFormErrors,
} from '../../schemas/supplierForm';

import { 
  validateSupplierForm, 
  createDefaultSupplierFormData, 
  generateSupplierCode,
  SUPPLIER_FIELD_LABELS,
  SUPPLIER_FIELD_HELP_TEXT 
} from '../../schemas/supplierForm';

import { mapSupplierFormToCreatePayload } from '../../lib/suppliers/mapSupplierForm';

interface SupplierCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplierId: string) => void;
  existingCodes?: string[];
  isLoading?: boolean;
}

export default function SupplierCreateModal({
  isOpen,
  onClose,
  onSuccess,
  existingCodes = [],
  isLoading = false,
}: SupplierCreateModalProps) {
  const [formData, setFormData] = useState<SupplierFormData>(() => {
    const defaultData = createDefaultSupplierFormData();
    console.log('Initial supplier form data:', defaultData);
    return defaultData;
  });
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { showToast } = useToast();

  // Handle close with unsaved changes protection
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !isSubmitting) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirm) return;
    }
    onClose();
  }, [hasUnsavedChanges, isSubmitting, onClose]);

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: keyof SupplierFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Generate supplier code
  const handleGenerateCode = useCallback(() => {
    const code = generateSupplierCode(formData.name, existingCodes);
    handleFieldChange('code', code);
  }, [formData.name, existingCodes, handleFieldChange]);

  // Parse and format additional emails as chips
  const formatAdditionalEmails = (emailString: string): string[] => {
    if (!emailString.trim()) return [];
    
    return emailString.split(/[,\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter((email, index, arr) => arr.indexOf(email) === index); // dedupe
  };

  // This function is no longer needed - inline in onChange

  // Validate single field
  const validateField = useCallback((field: keyof SupplierFormData, value: any): string | undefined => {
    const testData = { ...formData, [field]: value };
    const { errors: fieldErrors } = validateSupplierForm(testData);
    return fieldErrors[field];
  }, [formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
    const { isValid, errors: validationErrors } = validateSupplierForm(formData);
    
    if (!isValid) {
      setErrors(validationErrors);
      showToast('Please fix the form errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = mapSupplierFormToCreatePayload(formData);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Handle conflict errors (duplicate name/code)
          const errorData = await response.json();
          if (errorData.field) {
            setErrors({ [errorData.field]: errorData.message });
          } else {
            setErrors({ _form: errorData.message || 'Supplier name or code already exists' });
          }
          return;
        }
        throw new Error('Failed to create supplier');
      }

      const createdSupplier = await response.json();
      
      showToast(`Supplier "${formData.name}" created successfully`, 'success');
      onSuccess(createdSupplier.id);
      
      // Reset form for potential reuse
      setFormData(createDefaultSupplierFormData());
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error creating supplier:', error);
      setErrors({ 
        _form: error instanceof Error ? error.message : 'Failed to create supplier. Please try again.' 
      });
      showToast('Failed to create supplier', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation status - manual validation that actually works
  const isFormValid = formData.name && formData.name.trim().length >= 2 &&
                      Object.keys(errors).filter(key => key !== '_form').length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Supplier"
      description="Add a new supplier to your system."
      size="lg"
      closeOnOverlayClick={!hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Form-level error */}
        {errors._form && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4" role="alert">
            <div className="text-sm font-medium text-destructive">{errors._form}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Supplier Name - Required */}
          <div>
            <Input
              id="supplier-name"
              label={SUPPLIER_FIELD_LABELS.name}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={errors.name}
              helpText={SUPPLIER_FIELD_HELP_TEXT.name}
              required
              disabled={isSubmitting}
              autoFocus
              maxLength={80}
            />
          </div>

          {/* Supplier Code - Optional with Generate button */}
          <div>
            <Input
              id="supplier-code"
              label={SUPPLIER_FIELD_LABELS.code}
              value={formData.code || ''}
              onChange={(e) => handleFieldChange('code', e.target.value)}
              error={errors.code}
              helpText={SUPPLIER_FIELD_HELP_TEXT.code}
              disabled={isSubmitting}
              maxLength={16}
              rightIcon={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateCode}
                  disabled={isSubmitting || !formData.name.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                >
                  Generate
                </Button>
              }
            />
          </div>

          {/* Contact Name - Optional */}
          <div>
            <Input
              id="contact-name"
              label={SUPPLIER_FIELD_LABELS.contactName}
              value={formData.contactName || ''}
              onChange={(e) => handleFieldChange('contactName', e.target.value)}
              error={errors.contactName}
              helpText={SUPPLIER_FIELD_HELP_TEXT.contactName}
              disabled={isSubmitting}
              maxLength={80}
            />
          </div>

          {/* Phone - Optional */}
          <div>
            <Input
              id="supplier-phone"
              label={SUPPLIER_FIELD_LABELS.phone}
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              error={errors.phone}
              helpText={SUPPLIER_FIELD_HELP_TEXT.phone}
              disabled={isSubmitting}
              placeholder="+201234567890"
            />
          </div>

          {/* Primary Email - Optional */}
          <div>
            <Input
              id="primary-email"
              label={SUPPLIER_FIELD_LABELS.primaryEmail}
              type="email"
              value={formData.primaryEmail || ''}
              onChange={(e) => handleFieldChange('primaryEmail', e.target.value)}
              error={errors.primaryEmail}
              helpText={SUPPLIER_FIELD_HELP_TEXT.primaryEmail}
              disabled={isSubmitting}
              placeholder="orders@supplier.com"
            />
          </div>

          {/* Additional Emails - Optional */}
          <div>
            <Input
              id="additional-emails"
              label={SUPPLIER_FIELD_LABELS.additionalEmails}
              value={Array.isArray(formData.additionalEmails) ? formData.additionalEmails.join(', ') : ''}
              onChange={(e) => {
                const emailArray = formatAdditionalEmails(e.target.value);
                handleFieldChange('additionalEmails', emailArray);
              }}
              error={errors.additionalEmails}
              helpText={SUPPLIER_FIELD_HELP_TEXT.additionalEmails}
              disabled={isSubmitting}
              placeholder="sales@supplier.com, support@supplier.com"
            />
            
            {/* Email chips preview */}
            {Array.isArray(formData.additionalEmails) && formData.additionalEmails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.additionalEmails.map((email, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted text-muted-foreground border"
                  >
                    {email}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
