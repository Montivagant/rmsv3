import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/hooks';
import type { Event } from '../../events/types';
import { DataTable } from '../../components/DataTable';
import { ChartCard } from '../../components/cards/ChartCard';

interface ShiftData {
  userId: string;
  userName: string;
  shiftCount: number;
  totalHours: number;
  averageShiftDuration: number;
  firstShift: Date;
  lastShift: Date;
  activeShift?: {
    startedAt: number;
    duration: number;
  };
}

interface DailyShiftData {
  date: string;
  totalShifts: number;
  totalHours: number;
  uniqueUsers: number;
}

export default function ShiftsTimeReport() {
  const store = useEventStore();
  const [from, setFrom] = useState<string>(() => {
    // Default to last 30 days
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [to, setTo] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [branch, setBranch] = useState<string>('all');
  const [showActive, setShowActive] = useState<boolean>(true);

  const { userShifts, dailyShifts, totals } = useMemo(() => {
    const events = store.getAll();
    const starts = events.filter(e => e.type === 'shift.started');
    const ends = events.filter(e => e.type === 'shift.ended');

    const fromTs = from ? new Date(from).setHours(0, 0, 0, 0) : -Infinity;
    const toTs = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;

    // Map to track user shift data
    const userMap = new Map<string, ShiftData>();
    // Map to track daily shift data
    const dailyMap = new Map<string, DailyShiftData>();
    
    // Active shifts (started but not ended)
    const activeShifts = new Map<string, Event>();

    // Process shift starts
    starts.forEach(startEvent => {
      const startedAt = startEvent.payload?.startedAt as number;
      const userId = startEvent.payload?.userId as string;
      const userName = startEvent.payload?.userName as string;
      const branchId = (startEvent.payload as any)?.branchId as string | undefined;

      // Apply branch filter
      if (branch !== 'all' && branchId !== branch) return;

      // Find matching end event
      const endEvent = ends.find(e => 
        e.payload?.userId === userId && 
        e.payload?.startedAt === startedAt
      );

      // Check if shift is still active
      if (!endEvent) {
        activeShifts.set(userId, startEvent);
      }

      // Apply date filter
      if (startedAt < fromTs || startedAt > toTs) return;

      // Calculate duration
      const endedAt = endEvent?.payload?.endedAt as number | undefined;
      const duration = endedAt ? Math.max(0, endedAt - startedAt) : 0;

      // Update user data
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName,
          shiftCount: 0,
          totalHours: 0,
          averageShiftDuration: 0,
          firstShift: new Date(startedAt),
          lastShift: new Date(startedAt),
        });
      }

      const userData = userMap.get(userId)!;
      userData.shiftCount++;
      if (duration > 0) {
        userData.totalHours += duration / (1000 * 60 * 60); // Convert to hours
      }
      userData.firstShift = new Date(Math.min(userData.firstShift.getTime(), startedAt));
      userData.lastShift = new Date(Math.max(userData.lastShift.getTime(), startedAt));

      // Update daily data
      const dateKey = new Date(startedAt).toLocaleDateString();
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalShifts: 0,
          totalHours: 0,
          uniqueUsers: 0,
        });
      }

      const dailyData = dailyMap.get(dateKey)!;
      dailyData.totalShifts++;
      if (duration > 0) {
        dailyData.totalHours += duration / (1000 * 60 * 60);
      }
    });

    // Add active shift info to user data
    activeShifts.forEach((event, userId) => {
      const userData = userMap.get(userId);
      if (userData && showActive) {
        const startedAt = event.payload?.startedAt as number;
        const now = Date.now();
        userData.activeShift = {
          startedAt,
          duration: now - startedAt,
        };
      }
    });

    // Calculate averages and unique users per day
    userMap.forEach(userData => {
      userData.averageShiftDuration = userData.shiftCount > 0 
        ? userData.totalHours / userData.shiftCount 
        : 0;
    });

    // Calculate unique users per day
    dailyMap.forEach((dailyData, dateKey) => {
      const dayStarts = starts.filter(e => {
        const startedAt = e.payload?.startedAt as number;
        return new Date(startedAt).toLocaleDateString() === dateKey;
      });
      const uniqueUserIds = new Set(dayStarts.map(e => e.payload?.userId as string));
      dailyData.uniqueUsers = uniqueUserIds.size;
    });

    // Calculate totals
    const totalShifts = Array.from(userMap.values()).reduce((sum, user) => sum + user.shiftCount, 0);
    const totalHours = Array.from(userMap.values()).reduce((sum, user) => sum + user.totalHours, 0);
    const activeCount = activeShifts.size;

    return {
      userShifts: Array.from(userMap.values()).sort((a, b) => b.totalHours - a.totalHours),
      dailyShifts: Array.from(dailyMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      totals: {
        totalShifts,
        totalHours,
        activeCount,
        averageShiftLength: totalShifts > 0 ? totalHours / totalShifts : 0,
        uniqueUsers: userMap.size,
      },
    };
  }, [store, from, to, branch, showActive]);

  // Prepare chart data
  const weeklyChartData = useMemo(() => {
    // Get last 7 days of data
    const last7Days = dailyShifts.slice(0, 7).reverse();
    return last7Days.map(day => ({
      label: new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
      value: Math.round(day.totalHours * 10) / 10,
    }));
  }, [dailyShifts]);

  const userDistributionData = useMemo(() => {
    // Top 5 users by total hours
    return userShifts.slice(0, 5).map(user => ({
      label: user.userName,
      value: Math.round(user.totalHours * 10) / 10,
    }));
  }, [userShifts]);

  const columns = [
    {
      accessorKey: 'userName' as keyof ShiftData,
      header: 'Employee',
      cell: ({ getValue, row }: any) => (
        <div>
          <div className="font-medium">{getValue()}</div>
          {row.original.activeShift && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Active ({formatDuration(row.original.activeShift.duration)})
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'shiftCount' as keyof ShiftData,
      header: 'Total Shifts',
      cell: ({ getValue }: any) => (
        <span className="font-medium">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'totalHours' as keyof ShiftData,
      header: 'Total Hours',
      cell: ({ getValue }: any) => (
        <span>{formatHours(getValue())}</span>
      ),
    },
    {
      accessorKey: 'averageShiftDuration' as keyof ShiftData,
      header: 'Avg Shift',
      cell: ({ getValue }: any) => (
        <span>{formatHours(getValue())}</span>
      ),
    },
    {
      accessorKey: 'lastShift' as keyof ShiftData,
      header: 'Last Shift',
      cell: ({ getValue }: any) => (
        <span className="text-sm">
          {new Date(getValue()).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Shifts Time Analytics</h1>
        <p className="text-text-secondary">
          Comprehensive analysis of employee shifts and working hours
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary">{totals.uniqueUsers}</div>
          <div className="text-sm text-text-secondary">Total Employees</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">{totals.totalShifts}</div>
          <div className="text-sm text-text-secondary">Total Shifts</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-purple-600">{formatHours(totals.totalHours)}</div>
          <div className="text-sm text-text-secondary">Total Hours</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-orange-600">{formatHours(totals.averageShiftLength)}</div>
          <div className="text-sm text-text-secondary">Avg Shift Length</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{totals.activeCount}</div>
          <div className="text-sm text-text-secondary">Active Now</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm mb-1 text-text-secondary">From</label>
            <input 
              type="date" 
              value={from} 
              onChange={e => setFrom(e.target.value)} 
              className="input-base border p-2 rounded" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-secondary">To</label>
            <input 
              type="date" 
              value={to} 
              onChange={e => setTo(e.target.value)} 
              className="input-base border p-2 rounded" 
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-secondary">Branch</label>
            <select 
              value={branch} 
              onChange={e => setBranch(e.target.value)} 
              className="input-base border p-2 rounded"
            >
              <option value="all">All Branches</option>
              <option value="main-restaurant">Main</option>
              <option value="downtown">Downtown</option>
              <option value="mall">Shopping Mall</option>
              <option value="airport">Airport</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showActive"
              checked={showActive}
              onChange={e => setShowActive(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="showActive" className="text-sm text-text-secondary">
              Show active shifts
            </label>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Weekly Hours Trend"
          subtitle="Total hours worked per day"
          type="line"
          data={weeklyChartData}
          height={250}
        />
        <ChartCard
          title="Top Employees by Hours"
          subtitle="Total hours in selected period"
          type="bar"
          data={userDistributionData}
          height={250}
        />
      </div>

      {/* Employee Details Table */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Employee Shift Details</h2>
        <DataTable
          data={userShifts}
          columns={columns}
          emptyState={{
            title: "No shifts found",
            description: "No shift data available for the selected period",
          }}
        />
      </div>

      {/* Daily Summary Table */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 font-medium text-text-secondary">Date</th>
                <th className="py-2 pr-4 font-medium text-text-secondary">Total Shifts</th>
                <th className="py-2 pr-4 font-medium text-text-secondary">Total Hours</th>
                <th className="py-2 pr-4 font-medium text-text-secondary">Unique Employees</th>
                <th className="py-2 pr-4 font-medium text-text-secondary">Avg Hours/Employee</th>
              </tr>
            </thead>
            <tbody>
              {dailyShifts.length === 0 ? (
                <tr>
                  <td className="py-4 text-text-muted" colSpan={5}>
                    No shift data available for the selected period
                  </td>
                </tr>
              ) : (
                dailyShifts.map((day, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-surface-secondary/50">
                    <td className="py-2 pr-4 font-medium">
                      {new Date(day.date).toLocaleDateString('en', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-2 pr-4">{day.totalShifts}</td>
                    <td className="py-2 pr-4">{formatHours(day.totalHours)}</td>
                    <td className="py-2 pr-4">{day.uniqueUsers}</td>
                    <td className="py-2 pr-4">
                      {day.uniqueUsers > 0 
                        ? formatHours(day.totalHours / day.uniqueUsers) 
                        : '—'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
