/**
 * Shift Management Page
 * Create, edit, and assign shifts to users
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
// Remove TanStack table import since we're using custom DataTable
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import { useToast } from '../../hooks/useToast';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import {
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  type Shift,
  type CreateShiftInput,
  type UpdateShiftInput,
} from '../../shifts/repository';
import { listUsers } from '../../management/repository';
import { DataTable } from '../../components';
import type { User } from '../../types/user';

// Define custom column type for our DataTable
interface Column<T> {
  id?: string;
  accessorKey?: keyof T;
  header: string;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

interface ShiftFormData {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  assignedUserIds: string[];
  isActive: boolean;
}

const defaultFormData: ShiftFormData = {
  name: '',
  description: '',
  startTime: '09:00',
  endTime: '17:00',
  daysOfWeek: [],
  assignedUserIds: [],
  isActive: true,
};

export default function Shifts() {
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: shiftsData, refetch: refetchShifts } = useRepository<Shift[]>(listShifts, []);
  const shifts = shiftsData ?? [];

  const { data: usersData } = useRepository<User[]>(listUsers, []);
  const users = usersData ?? [];

  const createShiftMutation = useRepositoryMutation((input: CreateShiftInput) => createShift(input));
  const updateShiftMutation = useRepositoryMutation((input: { id: string; data: UpdateShiftInput }) =>
    updateShift(input.id, input.data),
  );
  const deleteShiftMutation = useRepositoryMutation((id: string) => deleteShift(id));

  const isEditing = editingShift != null;

  const handleCreateNew = () => {
    setFormData(defaultFormData);
    setEditingShift(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (shift: Shift) => {
    setFormData({
      name: shift.name,
      description: shift.description ?? '',
      startTime: shift.startTime,
      endTime: shift.endTime,
      daysOfWeek: [...shift.daysOfWeek],
      assignedUserIds: [...shift.assignedUserIds],
      isActive: shift.isActive,
    });
    setEditingShift(shift);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingShift(null);
    setFormData(defaultFormData);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      showToast({ title: 'Validation Error', description: 'Shift name is required', variant: 'error' });
      return;
    }

    if (formData.startTime >= formData.endTime) {
      showToast({
        title: 'Validation Error',
        description: 'End time must be after start time',
        variant: 'error',
      });
      return;
    }

    if (formData.daysOfWeek.length === 0) {
      showToast({ title: 'Validation Error', description: 'Please select at least one day', variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editingShift) {
        const updateData: UpdateShiftInput = {
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime,
          daysOfWeek: [...formData.daysOfWeek],
          assignedUserIds: [...formData.assignedUserIds],
          isActive: formData.isActive,
        };
        const trimmedDescription = formData.description.trim();
        if (trimmedDescription) {
          updateData.description = trimmedDescription;
        }

        await updateShiftMutation.mutate({ id: editingShift.id, data: updateData });
        showToast({
          title: 'Shift Updated',
          description: 'Shift has been updated successfully',
          variant: 'success',
        });
      } else {
        const createData: CreateShiftInput = {
          name: formData.name,
          startTime: formData.startTime,
          endTime: formData.endTime,
          daysOfWeek: [...formData.daysOfWeek],
          assignedUserIds: [...formData.assignedUserIds],
          isActive: formData.isActive,
        };
        const trimmedDescription = formData.description.trim();
        if (trimmedDescription) {
          createData.description = trimmedDescription;
        }

        await createShiftMutation.mutate(createData);
        showToast({
          title: 'Shift Created',
          description: 'New shift has been created successfully',
          variant: 'success',
        });
      }

      refetchShifts();
      handleCloseModal();
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save shift',
        variant: 'error',
      });
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (shift: Shift) => {
    if (!confirm(`Are you sure you want to delete "${shift.name}"?`)) return;

    setIsSubmitting(true);
    try {
      await deleteShiftMutation.mutate(shift.id);
      showToast({
        title: 'Shift Deleted',
        description: 'Shift has been deleted successfully',
        variant: 'success',
      });
      refetchShifts();
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to delete shift', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDays = (daysOfWeek: number[]) =>
    daysOfWeek
      .slice()
      .sort()
      .map((day) => DAYS_OF_WEEK.find((d) => d.value === day)?.short)
      .filter(Boolean)
      .join(', ');

  const formatTime = (time: string) =>
    new Date(`1970-01-01T${time}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const columns: Column<Shift>[] = [
    {
      accessorKey: 'name',
      header: 'Shift Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatTime(row.original.startTime)} - {formatTime(row.original.endTime)}
        </div>
      ),
    },
    {
      accessorKey: 'daysOfWeek',
      header: 'Days',
      cell: ({ row }) => <div className="text-sm">{formatDays(row.original.daysOfWeek)}</div>,
    },
    {
      id: 'assignedUsers',
      header: 'Assigned Users',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.assignedUserIds.length > 0
            ? `${row.original.assignedUserIds.length} user(s)`
            : 'No users assigned'}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.original.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleStatusChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleDayToggle = (event: ChangeEvent<HTMLInputElement>, dayValue: number) => {
    const { checked } = event.currentTarget;
    setFormData((prev) => {
      const nextDays = checked
        ? Array.from(new Set([...prev.daysOfWeek, dayValue]))
        : prev.daysOfWeek.filter((day) => day !== dayValue);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const handleUserToggle = (event: ChangeEvent<HTMLInputElement>, userId: string) => {
    const { checked } = event.currentTarget;
    setFormData((prev) => {
      const nextUsers = checked
        ? Array.from(new Set([...prev.assignedUserIds, userId]))
        : prev.assignedUserIds.filter((id) => id !== userId);
      return { ...prev, assignedUserIds: nextUsers };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shifts</h1>
          <p className="text-muted-foreground">Create and manage work shifts for your staff</p>
        </div>
        <Button onClick={handleCreateNew}>Create Shift</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={shifts} />
        </CardContent>
      </Card>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Shift' : 'Create New Shift'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shift Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="e.g., Morning Shift"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Checkbox
                      checked={formData.isActive}
                      onChange={handleStatusChange}
                      label="Active"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Optional description"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time *</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, startTime: event.target.value }))
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time *</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, endTime: event.target.value }))
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Days of Week *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Checkbox
                        key={day.value}
                        checked={formData.daysOfWeek.includes(day.value)}
                        onChange={(event) => handleDayToggle(event, day.value)}
                        label={day.label}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assigned Users</label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {users.map((user) => (
                      <Checkbox
                        key={user.id}
                        checked={formData.assignedUserIds.includes(user.id)}
                        onChange={(event) => handleUserToggle(event, user.id)}
                        label={`${user.name} (${user.email})`}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Saving...' : isEditing ? 'Update Shift' : 'Create Shift'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
