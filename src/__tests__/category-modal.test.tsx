import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryCreateModal from '../components/categories/CategoryCreateModal';

// Mock hooks
const mockShowToast = vi.fn();
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

vi.mock('../hooks/useDismissableLayer', () => ({
  useDismissableLayer: () => ({ layerRef: { current: null }, onBlur: undefined })
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('CategoryCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    existingReferences: ['APPETIZERS', 'MAINS'],
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-category-id' }),
    });
  });

  it('should render modal with all form fields', () => {
    render(<CategoryCreateModal {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Create Category' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Reference Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Category' })).toBeInTheDocument();
  });

  it('should focus on name field when opened', () => {
    render(<CategoryCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Category Name');
    expect(nameInput).toHaveFocus();
  });

  it('should disable submit button when form is invalid', () => {
    render(<CategoryCreateModal {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Create Category' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when form is valid', async () => {
    const user = userEvent.setup();
    render(<CategoryCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Category Name');
    await user.type(nameInput, 'Desserts');
    
    const submitButton = screen.getByRole('button', { name: 'Create Category' });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('should generate category reference when Generate button is clicked', async () => {
    const user = userEvent.setup();
    render(<CategoryCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Category Name');
    await user.type(nameInput, 'Side Dishes');
    
    const generateButton = screen.getByRole('button', { name: 'Generate' });
    await user.click(generateButton);
    
    const referenceInput = screen.getByLabelText('Reference Code');
    expect(referenceInput).toHaveValue();
    expect((referenceInput as HTMLInputElement).value).toMatch(/^[A-Z0-9]+$/);
  });

  it('should validate name length', async () => {
    const user = userEvent.setup();
    render(<CategoryCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Category Name');
    await user.type(nameInput, 'A'); // Too short
    
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate reference format', async () => {
    const user = userEvent.setup();
    render(<CategoryCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Category Name');
    await user.type(nameInput, 'Valid Category');
    
    const referenceInput = screen.getByLabelText('Reference Code');
    await user.type(referenceInput, 'INVALID REFERENCE'); // Contains space
    
    fireEvent.blur(referenceInput);
    
    await waitFor(() => {
      expect(screen.getByText(/no spaces/i)).toBeInTheDocument();
    });
  });

  it('should submit form successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<CategoryCreateModal {...defaultProps} onSuccess={onSuccess} />);
    
    // Fill form
    await user.type(screen.getByLabelText('Category Name'), 'Desserts');
    await user.type(screen.getByLabelText('Reference Code'), 'DESSERTS');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Category' });
    await user.click(submitButton);
    
    // Verify API call
    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalled();
    });
    
    // Verify success callback
    expect(onSuccess).toHaveBeenCalledWith('new-category-id');
    expect(mockShowToast).toHaveBeenCalledWith(
      'Category "Desserts" created successfully',
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
        message: 'Category name already exists'
      })
    });
    
    render(<CategoryCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Category Name'), 'Duplicate Category');
    await user.click(screen.getByRole('button', { name: 'Create Category' }));
    
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('should handle generic API errors', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    
    render(<CategoryCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Category Name'), 'Test Category');
    await user.click(screen.getByRole('button', { name: 'Create Category' }));
    
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to create category', 'error');
    });
  });

  it('should warn about unsaved changes when closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<CategoryCreateModal {...defaultProps} onClose={onClose} />);
    
    // Make changes to mark form as dirty
    await user.type(screen.getByLabelText('Category Name'), 'Test');
    
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
    
    render(<CategoryCreateModal {...defaultProps} />);
    
    await user.type(screen.getByLabelText('Category Name'), 'Test Category');
    await user.click(screen.getByRole('button', { name: 'Create Category' }));
    
    // Form should be disabled during submission
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    });
  });

  it('should submit form without reference when not provided', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<CategoryCreateModal {...defaultProps} onSuccess={onSuccess} />);
    
    // Fill only required field
    await user.type(screen.getByLabelText('Category Name'), 'Simple Category');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Category' });
    await user.click(submitButton);
    
    // Verify API call omits reference
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Simple Category'
        })
      });
    });
    
    expect(onSuccess).toHaveBeenCalledWith('new-category-id');
  });
});
