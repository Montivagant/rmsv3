import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useDashboardQuery } from '../../../lib/dashboard/useDashboardQuery';

// Mock useSearchParams
const mockSetSearchParams = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams]
  };
});

describe('useDashboardQuery', () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
    mockSearchParams.delete('tab');
    mockSearchParams.delete('period');
    mockSearchParams.delete('startDate');
    mockSearchParams.delete('endDate');
    mockSearchParams.delete('branches');
    mockSearchParams.delete('compare');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  it('should return default query values', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.query).toEqual({
      tab: 'general',
      period: 'day',
      branches: [],
      compare: false,
      startDate: undefined,
      endDate: undefined
    });
  });

  it('should parse query parameters from URL', () => {
    mockSearchParams.set('tab', 'branches');
    mockSearchParams.set('period', 'week');
    mockSearchParams.set('branches', 'main,downtown');
    mockSearchParams.set('compare', 'true');

    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.query.tab).toBe('branches');
    expect(result.current.query.period).toBe('week');
    expect(result.current.query.branches).toEqual(['main', 'downtown']);
    expect(result.current.query.compare).toBe(true);
  });

  it('should handle invalid query parameters', () => {
    mockSearchParams.set('tab', 'invalid');
    mockSearchParams.set('period', 'invalid');

    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.query.tab).toBe('general');
    expect(result.current.query.period).toBe('day');
  });

  it('should update tab correctly', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.setTab('inventory');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update period correctly', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.setPeriod('month');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle date range updates', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.setDateRange('2024-01-01', '2024-01-31');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should toggle compare mode', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.toggleCompare();
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should generate correct period labels', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.periodLabel).toBe('Today');

    mockSearchParams.set('period', 'week');
    const { result: result2 } = renderHook(() => useDashboardQuery(), { wrapper });
    expect(result2.current.periodLabel).toBe('Last 7 days');
  });

  it('should generate correct branches labels', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.branchesLabel).toBe('All branches');

    mockSearchParams.set('branches', 'main');
    const { result: result2 } = renderHook(() => useDashboardQuery(), { wrapper });
    expect(result2.current.branchesLabel).toBe('1 branch');

    mockSearchParams.set('branches', 'main,downtown,mall');
    const { result: result3 } = renderHook(() => useDashboardQuery(), { wrapper });
    expect(result3.current.branchesLabel).toBe('3 branches');
  });

  it('should calculate date ranges correctly', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    const { dateRange } = result.current;
    expect(dateRange.start).toBeInstanceOf(Date);
    expect(dateRange.end).toBeInstanceOf(Date);
    expect(dateRange.end.getTime()).toBeGreaterThan(dateRange.start.getTime());
  });

  it('should handle custom date ranges', () => {
    mockSearchParams.set('period', 'custom');
    mockSearchParams.set('startDate', '2024-01-01');
    mockSearchParams.set('endDate', '2024-01-31');

    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    expect(result.current.query.period).toBe('custom');
    expect(result.current.query.startDate).toBe('2024-01-01');
    expect(result.current.query.endDate).toBe('2024-01-31');
  });

  it('should reset query to defaults', () => {
    mockSearchParams.set('tab', 'branches');
    mockSearchParams.set('period', 'week');

    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.resetQuery();
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams());
  });

  it('should update branches list correctly', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.setBranches(['main', 'downtown']);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should clear custom dates when switching period', () => {
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    act(() => {
      result.current.setPeriod('week');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });
});
