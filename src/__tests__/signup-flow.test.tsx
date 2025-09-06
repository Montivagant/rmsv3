/**
 * Comprehensive Signup Flow Tests
 * 
 * Tests the complete "Sign Up → Confirm → Email → Log In" flow for DashUp
 * as specified in the requirements.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import Signup from '../pages/Signup';
import SignupSuccess from '../pages/SignupSuccess';
import Login from '../pages/Login';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { EventStoreProvider } from '../events/context';
import { NotificationProvider } from '../components';
import { ToastProvider } from '../components/Toast';
import * as authAPI from '../api/auth';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock API calls
vi.mock('../api/auth', () => ({
  signup: vi.fn(),
  postJSON: vi.fn(),
}));

// Mock EventStore to avoid loading issues
vi.mock('../events/context', () => ({
  EventStoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useEventStore: () => ({ append: vi.fn(), query: vi.fn() }),
}));

// Test wrapper component with all providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <EventStoreProvider>
          <NotificationProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </NotificationProvider>
        </EventStoreProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

describe('Signup Flow - Happy Path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authAPI.signup).mockResolvedValue({
      userId: 'usr_123',
      businessId: 'biz_456',
      accountId: 'biz_456',
      emailEnqueued: true,
    });
  });

  it('completes full signup flow with valid data', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Verify page loads with correct branding
    expect(screen.getByRole('heading', { name: /DashUp/i })).toBeInTheDocument();
    expect(screen.getByText(/Sign up to get started with DashUp/i)).toBeInTheDocument();

    // Fill out the form with valid data
    await user.type(screen.getByLabelText(/Your Name/i), 'Ahmed Mohamed');
    await user.type(screen.getByLabelText(/Phone Number/i), '1012345678');
    await user.type(screen.getByLabelText(/Email/i), 'ahmed@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'securepass123');
    await user.type(screen.getByLabelText(/Business Name/i), 'Cairo Bistro');
    
    // Select business type using autocomplete
    const businessTypeInput = screen.getByLabelText(/Business Type/i);
    await user.type(businessTypeInput, 'Quick Service');
    await waitFor(() => {
      expect(screen.getByText('Quick Service')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Quick Service'));

    // Accept terms and conditions
    const termsCheckbox = screen.getByLabelText(/I accept the Terms and Conditions/i);
    await user.click(termsCheckbox);

    // Verify create account button is now enabled
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    expect(submitButton).not.toBeDisabled();

    // Submit the form
    await user.click(submitButton);

    // Verify API was called with correct data
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

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock delayed response
    vi.mocked(authAPI.signup).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Fill form quickly
    await user.type(screen.getByLabelText(/Your Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Phone Number/i), '1012345678');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.type(screen.getByLabelText(/Business Name/i), 'Test Business');
    
    const businessTypeInput = screen.getByLabelText(/Business Type/i);
    await user.type(businessTypeInput, 'Other');
    await user.click(screen.getByText('Other'));
    
    await user.click(screen.getByLabelText(/I accept the Terms and Conditions/i));

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    await user.click(submitButton);

    // Verify loading state
    expect(screen.getByRole('button', { name: /Submitting.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();
  });
});

describe('Signup Flow - Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    expect(submitButton).toBeDisabled();

    // Fill some fields but leave others empty
    await user.type(screen.getByLabelText(/Your Name/i), 'Test');
    await user.clear(screen.getByLabelText(/Your Name/i));

    // Button should remain disabled
    expect(submitButton).toBeDisabled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/Email/i);
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    // Should show validation error
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/Password/i);
    
    // Enter weak password
    await user.type(passwordInput, 'weak');
    await user.tab();

    // Should show strength requirement
    expect(screen.getByText(/Password must be at least 8 characters and include at least 1 letter and 1 number/i)).toBeInTheDocument();
  });

  it('validates Egypt phone number format', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    
    // Enter invalid phone (too short)
    await user.type(phoneInput, '12345');
    await user.tab();

    // Should show validation error
    expect(screen.getByText(/Enter a valid Egypt local number \(9–10 digits\)/i)).toBeInTheDocument();
  });

  it('requires terms acceptance', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Fill all fields except terms
    await user.type(screen.getByLabelText(/Your Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Phone Number/i), '1012345678');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.type(screen.getByLabelText(/Business Name/i), 'Test Business');
    
    const businessTypeInput = screen.getByLabelText(/Business Type/i);
    await user.type(businessTypeInput, 'Other');
    await user.click(screen.getByText('Other'));

    // Submit button should remain disabled without terms acceptance
    const submitButton = screen.getByRole('button', { name: /Create account/i });
    expect(submitButton).toBeDisabled();
  });
});

describe('Signup Flow - Server Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles rate limiting errors', async () => {
    const user = userEvent.setup();
    
    vi.mocked(authAPI.signup).mockRejectedValue({
      status: 429,
      message: 'Too many requests',
    });

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/Your Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Phone Number/i), '1012345678');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.type(screen.getByLabelText(/Business Name/i), 'Test Business');
    
    const businessTypeInput = screen.getByLabelText(/Business Type/i);
    await user.type(businessTypeInput, 'Other');
    await user.click(screen.getByText('Other'));
    
    await user.click(screen.getByLabelText(/I accept the Terms and Conditions/i));
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    // Should show rate limit error
    await waitFor(() => {
      expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
    });
  });

  it('handles server validation errors', async () => {
    const user = userEvent.setup();
    
    vi.mocked(authAPI.signup).mockRejectedValue({
      status: 400,
      data: {
        errors: {
          email: 'Email already exists',
          password: 'Password too weak',
        }
      }
    });

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/Your Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Phone Number/i), '1012345678');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.type(screen.getByLabelText(/Business Name/i), 'Test Business');
    
    const businessTypeInput = screen.getByLabelText(/Business Type/i);
    await user.type(businessTypeInput, 'Other');
    await user.click(screen.getByText('Other'));
    
    await user.click(screen.getByLabelText(/I accept the Terms and Conditions/i));
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    // Should show field-specific errors
    await waitFor(() => {
      expect(screen.getByText(/There were validation errors/i)).toBeInTheDocument();
    });
  });
});

describe('Signup Success Screen', () => {
  it('renders success screen with correct content', () => {
    render(
      <TestWrapper>
        <SignupSuccess />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /DashUp/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Thank you for signing up!/i })).toBeInTheDocument();
    expect(screen.getByText(/You'll receive an email with your account details within a few minutes/i)).toBeInTheDocument();
    
    const loginButton = screen.getByRole('link', { name: /Go to Login/i });
    expect(loginButton).toHaveAttribute('href', '/login');
  });

  it('displays DashUp logo', () => {
    render(
      <TestWrapper>
        <SignupSuccess />
      </TestWrapper>
    );

    const logo = screen.getByRole('img', { name: /DashUp/i });
    expect(logo).toHaveAttribute('src', '/dashup-logo.svg');
    expect(logo).toHaveAttribute('width', '64');
    expect(logo).toHaveAttribute('height', '64');
  });
});

describe('Login Screen Integration', () => {
  it('renders login screen with DashUp branding', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /DashUp/i })).toBeInTheDocument();
    expect(screen.getByText(/Restaurant Management System/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('has link to signup from login', () => {
    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const loginLink = screen.getByText(/Already have an account\? Log in/i);
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

describe('Accessibility Tests', () => {
  it('signup form is accessible', async () => {
    const { container } = render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('success screen is accessible', async () => {
    const { container } = render(
      <TestWrapper>
        <SignupSuccess />
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('login screen is accessible', async () => {
    const { container } = render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Tab through form fields
    await user.tab(); // Name field
    expect(screen.getByLabelText(/Your Name/i)).toHaveFocus();

    await user.tab(); // Phone field
    expect(screen.getByLabelText(/Phone Number/i)).toHaveFocus();

    await user.tab(); // Email field
    expect(screen.getByLabelText(/Email/i)).toHaveFocus();

    await user.tab(); // Password field
    expect(screen.getByLabelText(/Password/i)).toHaveFocus();

    await user.tab(); // Business name field
    expect(screen.getByLabelText(/Business Name/i)).toHaveFocus();

    await user.tab(); // Business type field
    expect(screen.getByLabelText(/Business Type/i)).toHaveFocus();

    await user.tab(); // Terms checkbox
    expect(screen.getByLabelText(/I accept the Terms and Conditions/i)).toHaveFocus();
  });

  it('has proper ARIA labels and descriptions', () => {
    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Check form element exists
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    // Check main landmark
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();

    // Check required field indicators
    const requiredFields = screen.getAllByText('*');
    expect(requiredFields).toHaveLength(6); // Name, Phone, Email, Password, Business Name, Business Type
  });
});

describe('Theme Support', () => {
  it('renders correctly in light mode', () => {
    render(
      <TestWrapper>
        <div data-theme="light">
          <Signup />
        </div>
      </TestWrapper>
    );

    // Should render without throwing
    expect(screen.getByRole('heading', { name: /DashUp/i })).toBeInTheDocument();
  });

  it('renders correctly in dark mode', () => {
    render(
      <TestWrapper>
        <div data-theme="dark">
          <Signup />
        </div>
      </TestWrapper>
    );

    // Should render without throwing
    expect(screen.getByRole('heading', { name: /DashUp/i })).toBeInTheDocument();
  });
});

describe('Terms and Conditions Collapsible', () => {
  it('expands terms content when checkbox is checked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    // Terms content should not be visible initially
    expect(screen.queryByText(/Terms and Conditions placeholder/i)).not.toBeInTheDocument();

    // Click the collapsible trigger
    const termsButton = screen.getByRole('button', { name: /Terms and Conditions/i });
    await user.click(termsButton);

    // Terms content should now be visible
    await waitFor(() => {
      expect(screen.getByText(/Terms and Conditions placeholder/i)).toBeInTheDocument();
    });
  });

  it('maintains collapsible state', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const termsButton = screen.getByRole('button', { name: /Terms and Conditions/i });
    
    // Open terms
    await user.click(termsButton);
    await waitFor(() => {
      expect(screen.getByText(/Terms and Conditions placeholder/i)).toBeInTheDocument();
    });

    // Close terms
    await user.click(termsButton);
    await waitFor(() => {
      expect(screen.queryByText(/Terms and Conditions placeholder/i)).not.toBeInTheDocument();
    });
  });
});

describe('Phone Input Egypt (+20) Specific Tests', () => {
  it('shows +20 prefix and accepts only digits', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    
    // Should show +20 prefix in UI
    expect(screen.getByText('+20')).toBeInTheDocument();

    // Type letters and symbols, should be filtered to digits only
    await user.type(phoneInput, 'abc123def456xyz');
    
    expect(phoneInput).toHaveValue('123456');
  });

  it('validates local phone number length', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Signup />
      </TestWrapper>
    );

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    
    // Test valid length (10 digits)
    await user.clear(phoneInput);
    await user.type(phoneInput, '1012345678');
    await user.tab();
    
    // Should not show error for valid length
    expect(screen.queryByText(/Enter a valid Egypt local number/i)).not.toBeInTheDocument();

    // Test invalid length (too short)
    await user.clear(phoneInput);
    await user.type(phoneInput, '12345');
    await user.tab();
    
    // Should show error for invalid length
    expect(screen.getByText(/Enter a valid Egypt local number \(9–10 digits\)/i)).toBeInTheDocument();
  });
});