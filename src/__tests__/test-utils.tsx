/**
 * Test Utilities for DashUp
 * 
 * Provides clean test wrappers and utilities
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';

// Mock providers for clean testing
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => children;
const MockEventStoreProvider = ({ children }: { children: React.ReactNode }) => children;
const MockNotificationProvider = ({ children }: { children: React.ReactNode }) => children;
const MockToastProvider = ({ children }: { children: React.ReactNode }) => children;

// Test wrapper with all necessary providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <MockThemeProvider>
        <MockEventStoreProvider>
          <MockNotificationProvider>
            <MockToastProvider>
              {children}
            </MockToastProvider>
          </MockNotificationProvider>
        </MockEventStoreProvider>
      </MockThemeProvider>
    </BrowserRouter>
  );
}

// Custom render function
function render(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: TestWrapper, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { render };
