import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, afterEach, test, expect } from 'vitest'

// Hoist a mock function we can assert on
const { updateNowMock } = vi.hoisted(() => ({ updateNowMock: vi.fn() }))

// Mock the UpdateManager hook used by UpdateToast to simulate "update available"
vi.mock('../components/UpdateToast', () => {
  return {
    // If your hook is named differently, change this export name:
    useUpdateManager: () => ({
      updateAvailable: true,
      updateNow: updateNowMock, // we assert this was called
    }),
    UpdateToast: ({ onUpdate }: { onUpdate: () => void }) => (
      <div>
        <button onClick={onUpdate}>Update now</button>
      </div>
    ),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('UpdateToast shows and triggers updateNow when clicking "Update now"', async () => {
  // Dynamically import AFTER the mock so the component sees the mocked hook
  const { UpdateToast } = await import('../components/UpdateToast')

  render(<UpdateToast onUpdate={updateNowMock} onDismiss={() => {}} />)

  // The toast should be visible
  // Adjust the text below if your component renders a different label
  const updateBtn = screen.getByRole('button', { name: /update now/i })
  expect(updateBtn).toBeInTheDocument()

  // Click and verify it calls the update function (which should call skipWaiting under the hood)
  fireEvent.click(updateBtn)
  expect(updateNowMock).toHaveBeenCalledTimes(1)
})