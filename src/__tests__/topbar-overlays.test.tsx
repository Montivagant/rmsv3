import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TopBar } from '../components/navigation/TopBar';

// Helper to render within Router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('TopBar overlays - Notifications, Profile, and Search', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Ensure clean DOM per test
    document.body.innerHTML = '';
  });

  it('opens Notifications, dismisses via Escape, outside click, and route change', async () => {
    renderWithRouter(
      <TopBar
        userName="Tester"
        userRole="Admin"
        notifications={3}
        onSearch={() => {}}
        onThemeToggle={() => {}}
        onProfileAction={() => {}}
        isDarkMode={false}
      />
    );

    // Open notifications
    const notifTrigger = screen.getByRole('button', { name: /notifications/i });
    await user.click(notifTrigger);

    // Overlay appears
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();

    // Dismiss with Escape
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument();

    // Re-open and dismiss by outside click
    await user.click(notifTrigger);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument();

    // Re-open and dismiss on route change (popstate)
    await user.click(notifTrigger);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('opens Profile menu and dismisses with Escape', async () => {
    renderWithRouter(
      <TopBar
        userName="Tester"
        userRole="Admin"
        notifications={0}
        onSearch={() => {}}
        onThemeToggle={() => {}}
        onProfileAction={() => {}}
        isDarkMode={false}
      />
    );

    // Find profile trigger by accessible name (contains the user name)
    const profileTrigger = screen.getByRole('button', { name: /tester/i });
    await user.click(profileTrigger);

    // Profile overlay visible (assert a known item within)
    expect(screen.getByText(/your profile/i)).toBeInTheDocument();

    // Escape closes
    await user.keyboard('{Escape}');
    expect(screen.queryByText(/your profile/i)).not.toBeInTheDocument();
  });

  it('one overlay at a time: opening Notifications closes Search, and vice versa', async () => {
    renderWithRouter(
      <TopBar
        userName="Tester"
        userRole="Admin"
        notifications={1}
        onSearch={() => {}}
        onThemeToggle={() => {}}
        onProfileAction={() => {}}
        isDarkMode={false}
      />
    );

    // Open Search via trigger
    const searchTrigger = screen.getByRole('button', { name: /search \(cmd\+k\)/i });
    await user.click(searchTrigger);

    // Search dialog appears
    const searchDialog = screen.getByRole('dialog', { name: /search/i });
    expect(searchDialog).toBeInTheDocument();

    // Then open Notifications -> Search should close
    const notifTrigger = screen.getByRole('button', { name: /notifications/i });
    await user.click(notifTrigger);

    expect(screen.queryByRole('dialog', { name: /search/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();

    // Now open Search again, Notifications should close
    await user.click(searchTrigger);
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('search overlay supports Escape and clears query on dismiss', async () => {
    renderWithRouter(
      <TopBar
        userName="Tester"
        userRole="Admin"
        notifications={0}
        onSearch={() => {}}
        onThemeToggle={() => {}}
        onProfileAction={() => {}}
        isDarkMode={false}
      />
    );

    const searchTrigger = screen.getByRole('button', { name: /search \(cmd\+k\)/i });
    await user.click(searchTrigger);

    const searchInput = screen.getByPlaceholderText(/search orders, customers, products/i);
    await user.type(searchInput, 'burger');

    // ESC should dismiss and clear
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /search/i })).not.toBeInTheDocument();

    // Open again, input should be cleared
    await user.click(searchTrigger);
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    const reopenedInput = screen.getByPlaceholderText(/search orders, customers, products/i) as HTMLInputElement;
    expect(reopenedInput.value).toBe('');
  });
});
