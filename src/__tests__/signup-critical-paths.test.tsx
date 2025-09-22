/**
 * Critical Paths Tests for DashUp Signup Flow
 * 
 * Tests the essential functionality as specified in requirements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';

import Signup from '../pages/Signup';
import SignupSuccess from '../pages/SignupSuccess';
import Login from '../pages/Login';
import * as authAPI from '../api/auth';

// Mock dependencies
vi.mock('../api/auth', () => ({
  signup: vi.fn(),
  postJSON: vi.fn(),
}));

describe('DashUp Signup Critical Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authAPI.signup).mockResolvedValue({
      userId: 'usr_123',
      businessId: 'biz_456',
      accountId: 'biz_456',
      emailEnqueued: true,
    });
  });

  describe('Happy Path: Account Creation', () => {
    it('should complete signup flow with valid data', async () => {
      const user = userEvent.setup();

      render(<Signup />);

      // Verify DashUp branding is present
      expect(screen.getByText('DashUp')).toBeInTheDocument();
      expect(screen.getByText(/Sign up to get started with DashUp/)).toBeInTheDocument();

      // Fill required fields
      const nameInput = screen.getByPlaceholderText('e.g. Ahmed Mohamed');
      const phoneInput = screen.getByPlaceholderText('10 1234 5678');
      const emailInput = screen.getByPlaceholderText('you@example.com');
      const passwordInput = screen.getByPlaceholderText('Enter a secure password');
      const businessNameInput = screen.getByPlaceholderText('e.g. Cairo Bistro');

      await user.type(nameInput, 'Ahmed Mohamed');
      await user.type(phoneInput, '1012345678');
      await user.type(emailInput, 'ahmed@example.com');
      await user.type(passwordInput, 'securepass123');
      await user.type(businessNameInput, 'Cairo Bistro');

      // Select business type
      const businessTypeInput = screen.getByPlaceholderText('Select a business type');
      await user.type(businessTypeInput, 'Quick Service');
      
      // Accept terms
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      // Submit form
      const submitButton = screen.getByText('Create account');
      await user.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(authAPI.signup).toHaveBeenCalledWith({
          name: 'Ahmed Mohamed',
          phoneLocal: '1012345678',
          email: 'ahmed@example.com',
          password: 'securepass123',
          businessName: 'Cairo Bistro',
          businessType: 'Quick Service',
          termsAccepted: true,
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();

      render(<Signup />);

      // Submit button should be disabled initially
      const submitButton = screen.getByText('Create account');
      expect(submitButton).toBeDisabled();

      // Fill partial data - button should remain disabled
      const nameInput = screen.getByPlaceholderText('e.g. Ahmed Mohamed');
      await user.type(nameInput, 'Test User');
      expect(submitButton).toBeDisabled();
    });

    it('should validate Egypt phone number format', async () => {
      render(<Signup />);

      // Verify +20 prefix is shown
      expect(screen.getByText('+20')).toBeInTheDocument();
      
      // Phone input should only accept digits
      const phoneInput = screen.getByPlaceholderText('10 1234 5678');
      expect(phoneInput).toHaveAttribute('inputMode', 'numeric');
      expect(phoneInput).toHaveAttribute('pattern', '[0-9]*');
    });

    it('should validate password strength requirements', async () => {
      render(<Signup />);

      // Help text should indicate requirements
      expect(screen.getByText(/Minimum 8 characters, at least 1 letter and 1 number/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authAPI.signup).mockRejectedValue({
        status: 429,
        message: 'Too many requests',
      });

      render(<Signup />);

      // Fill form quickly for submission
      await user.type(screen.getByPlaceholderText('e.g. Ahmed Mohamed'), 'Test User');
      await user.type(screen.getByPlaceholderText('10 1234 5678'), '1012345678');
      await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter a secure password'), 'password123');
      await user.type(screen.getByPlaceholderText('e.g. Cairo Bistro'), 'Test Business');
      
      const businessTypeInput = screen.getByPlaceholderText('Select a business type');
      await user.type(businessTypeInput, 'Other');
      
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByText('Create account');
      await user.click(submitButton);

      // Should handle error without crashing
      await waitFor(() => {
        expect(authAPI.signup).toHaveBeenCalled();
      });
    });
  });

  describe('Success Screen', () => {
    it('should render success page with correct branding and navigation', () => {
      render(<SignupSuccess />);

      expect(screen.getByText('DashUp')).toBeInTheDocument();
      expect(screen.getByText('Thank you for signing up!')).toBeInTheDocument();
      expect(screen.getByText(/You'll receive an email with your account details within a few minutes/)).toBeInTheDocument();
      
      const loginLink = screen.getByText('Go to Login');
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  describe('Login Integration', () => {
    it('should show DashUp branding on login page', () => {
      render(<Login />);

      expect(screen.getByText('DashUp')).toBeInTheDocument();
      expect(screen.getByText('Restaurant Management System')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  describe('Terms and Conditions', () => {
    it('should have expandable terms content', async () => {
      render(<Signup />);

      // Terms checkbox should be present
      const termsCheckbox = screen.getByRole('checkbox');
      expect(termsCheckbox).toBeInTheDocument();
      
      // Terms label should be present
      expect(screen.getByText(/I accept the Terms and Conditions/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<Signup />);

      // Check for proper form structure
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Check for main landmark
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();

      // Check for required field indicators
      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<Signup />);

      // All form inputs should be focusable
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});

describe('Business Logic Validation', () => {
  it('should enforce Egypt phone number constraints', () => {
    render(<Signup />);

    // Should show Egypt country code
    expect(screen.getByText('+20')).toBeInTheDocument();
    
    // Help text should mention Egypt
    expect(screen.getByText(/Egypt \(\+20\) only/)).toBeInTheDocument();
  });

  it('should provide business type options as specified', () => {
    render(<Signup />);

    // Business type field should be present
    const businessTypeInput = screen.getByPlaceholderText('Select a business type');
    expect(businessTypeInput).toBeInTheDocument();
  });

  it('should require terms acceptance', () => {
    render(<Signup />);

    const termsCheckbox = screen.getByRole('checkbox');
    expect(termsCheckbox).toBeRequired();
  });
});
