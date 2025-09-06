import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SupplierCreateModal from '../components/suppliers/SupplierCreateModal';

// Mock hooks
const mockShowToast = vi.fn();
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

const mockUseDismissableLayer = vi.fn();
vi.mock('../hooks/useDismissableLayer', () => ({
  useDismissableLayer: mockUseDismissableLayer
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('SupplierCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    existingCodes: ['EXIST123', 'TEST456'],
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-supplier-id' }),
    });
  });

  it('should render modal with all form fields', () => {
    render(<SupplierCreateModal {...defaultProps} />);
    
    expect(screen.getByText('Create Supplier')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Emails')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Supplier' })).toBeInTheDocument();
  });

  it('should focus on name field when opened', () => {
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    expect(nameInput).toHaveFocus();
  });

  it('should disable submit button when form is invalid', () => {
    render(<SupplierCreateModal {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Create Supplier' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when form is valid', async () => {
    const user = userEvent.setup();
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    await user.type(nameInput, 'Test Supplier');
    
    const submitButton = screen.getByRole('button', { name: 'Create Supplier' });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('should generate supplier code when Generate button is clicked', async () => {
    const user = userEvent.setup();
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    await user.type(nameInput, 'Test Supplier Company');
    
    const generateButton = screen.getByRole('button', { name: 'Generate' });
    await user.click(generateButton);
    
    const codeInput = screen.getByLabelText('Supplier Code');
    expect(codeInput).toHaveValue();
    expect((codeInput as HTMLInputElement).value).toMatch(/^[A-Z0-9]+$/);
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    await user.type(nameInput, 'Test Supplier');
    
    const emailInput = screen.getByLabelText('Primary Email');
    await user.type(emailInput, 'invalid-email');
    
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it('should validate phone format', async () => {
    const user = userEvent.setup();
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    await user.type(nameInput, 'Test Supplier');
    
    const phoneInput = screen.getByLabelText('Phone Number');
    await user.type(phoneInput, '123-456-7890');
    
    fireEvent.blur(phoneInput);
    
    await waitFor(() => {
      expect(screen.getByText(/E.164 format/i)).toBeInTheDocument();
    });
  });

  it('should show email chips for additional emails', async () => {
    const user = userEvent.setup();
    render(<SupplierCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Supplier Name');
    await user.type(nameInput, 'Test Supplier');
    
    const additionalEmailsInput = screen.getByLabelText('Additional Emails');
    await user.type(additionalEmailsInput, 'sales@test.com, support@test.com');
    
    await waitFor(() => {
      expect(screen.getByText('sales@test.com')).toBeInTheDocument();
      expect(screen.getByText('support@test.com')).toBeInTheDocument();
    });
  });

  it('should submit form successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<SupplierCreateModal {...defaultProps} onSuccess={onSuccess} />);
    
    // Fill form
    await user.type(screen.getByLabelText('Supplier Name'), 'Test Supplier');
    await user.type(screen.getByLabelText('Contact Name'), 'John Doe');
    await user.type(screen.getByLabelText('Phone Number'), '+201234567890');
    await user.type(screen.getByLabelText('Primary Email'), 'orders@test.com');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Supplier' });
    await user.click(submitButton);
    
    // Verify API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Supplier',
          contactName: 'John Doe',
          phone: '+201234567890',
          primaryEmail: 'orders@test.com'
        })
      });
    });
    
    // Verify success callback
    expect(onSuccess).toHaveBeenCalledWith('new-supplier-id');
    expect(mockShowToast).toHaveBeenCalledWith(
      'Supplier "Test Supplier" created successfully',
      'success'
    );
  });

  it('should handle API conflict errors', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        field: 'name',
        message: 'Supplier name already exists'
      })
    });
    
    render(<SupplierCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Supplier Name'), 'Duplicate Supplier');
    await user.click(screen.getByRole('button', { name: 'Create Supplier' }));
    
    await waitFor(() => {
      expect(screen.getByText('Supplier name already exists')).toBeInTheDocument();
    });
  });

  it('should handle generic API errors', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    
    render(<SupplierCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Supplier Name'), 'Test Supplier');
    await user.click(screen.getByRole('button', { name: 'Create Supplier' }));
    
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to create supplier', 'error');
    });
  });

  it('should warn about unsaved changes when closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<SupplierCreateModal {...defaultProps} onClose={onClose} />);
    
    // Make changes to mark form as dirty
    await user.type(screen.getByLabelText('Supplier Name'), 'Test');
    
    // Try to close
    await user.click(screen.getByRole('button', { name: 'Close' }));
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    // Make API call hang
    (global.fetch as any).mockReturnValue(new Promise(() => {}));
    
    render(<SupplierCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Supplier Name'), 'Test Supplier');
    await user.click(screen.getByRole('button', { name: 'Create Supplier' }));
    
    // Form should be disabled during submission
    expect(screen.getByLabelText('Supplier Name')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });
});
