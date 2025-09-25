/**
 * User Management Page
 * Minimal yet type-safe implementation for managing users, roles, and branches.
 */

import { useMemo, useState } from 'react';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import {
  listUsers,
  listBranches,
  listRoles,
  createUser,
  updateUser,
  deleteUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../management/repository';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import { Card, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { DataTable } from '../../components/inventory/DataTable';
import { logger } from '../../shared/logger';
import type { User } from '../../types/user';
import type { Branch } from '../../types/branch';
import type { DynamicRole } from '../../rbac/permissions';
import { formatDate } from '../../lib/format';
import { validateEmail, validateName, validatePhone } from '../../utils/validation';

type UserFormState = {
  email: string;
  name: string;
  phone?: string;
  status: User['status'];
  roles: string[];
  branchIds: string[];
  notes?: string;
};

const INITIAL_FORM: UserFormState = {
  email: '',
  name: '',
  phone: '',
  status: 'active',
  roles: [],
  branchIds: [],
  notes: '',
};

export default function Users() {
  const { data: usersData, loading, refetch } = useRepository<User[]>(listUsers, []);
  const users = useMemo(() => usersData ?? [], [usersData]);

  const { data: rolesData } = useRepository<DynamicRole[]>(listRoles, []);
  const roles = useMemo(() => rolesData ?? [], [rolesData]);

  const { data: branchesData } = useRepository<Branch[]>(listBranches, []);
  const branches = useMemo(() => branchesData ?? [], [branchesData]);

  const createUserMutation = useRepositoryMutation((input: CreateUserInput) => createUser(input));
  const updateUserMutation = useRepositoryMutation((input: { id: string; data: UpdateUserInput }) =>
    updateUser(input.id, input.data),
  );
  const deleteUserMutation = useRepositoryMutation((input: { id: string; reason?: string; deletedBy?: string }) =>
    deleteUser(input.id, input.reason, input.deletedBy),
  );

  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formState, setFormState] = useState<UserFormState>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormState(INITIAL_FORM);
    setFormErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setFormState({
      email: user.email,
      name: user.name,
      phone: user.phone ?? '',
      status: user.status,
      roles: [...(user.roles ?? [])],
      branchIds: [...(user.branchIds ?? [])],
      notes: user.metadata?.notes ?? '',
    });
    setEditingUser(user);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setIsSubmitting(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const nameCheck = validateName(formState.name);
    if (!nameCheck.isValid) errors.name = nameCheck.message ?? 'Invalid name';

    const emailCheck = validateEmail(formState.email);
    if (!emailCheck.isValid) errors.email = emailCheck.message ?? 'Invalid email';

    if (formState.phone) {
      const phoneCheck = validatePhone(formState.phone);
      if (!phoneCheck.isValid) errors.phone = phoneCheck.message ?? 'Invalid phone number';
    }

    if (!formState.roles.length) errors.roles = 'Assign at least one role';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleRole = (roleId: string, checked: boolean) => {
    setFormState((prev) => {
      const nextRoles = checked
        ? Array.from(new Set([...prev.roles, roleId]))
        : prev.roles.filter((id) => id !== roleId);
      return { ...prev, roles: nextRoles };
    });
  };

  const toggleBranch = (branchId: string, checked: boolean) => {
    setFormState((prev) => {
      const nextBranches = checked
        ? Array.from(new Set([...(prev.branchIds ?? []), branchId]))
        : (prev.branchIds ?? []).filter((id) => id !== branchId);
      return { ...prev, branchIds: nextBranches };
    });
  };

  const getCreatePayload = (): CreateUserInput => {
    const payload: CreateUserInput = {
      email: formState.email.trim(),
      name: formState.name.trim(),
      status: formState.status,
      roles: [...formState.roles],
      branchIds: [...formState.branchIds],
      createdBy: 'current-user',
    };

    const phone = formState.phone?.trim();
    if (phone) payload.phone = phone;

    const notes = formState.notes?.trim();
    if (notes) payload.notes = notes;

    return payload;
  };

  const getUpdatePayload = (): UpdateUserInput => {
    const payload: UpdateUserInput = {
      status: formState.status,
      roles: [...formState.roles],
      branchIds: [...formState.branchIds],
    };

    const trimmedEmail = formState.email.trim();
    if (trimmedEmail) payload.email = trimmedEmail;

    const trimmedName = formState.name.trim();
    if (trimmedName) payload.name = trimmedName;

    const trimmedPhone = formState.phone?.trim();
    if (trimmedPhone) payload.phone = trimmedPhone;

    const trimmedNotes = formState.notes?.trim();
    if (trimmedNotes) payload.notes = trimmedNotes;

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const loadingId = showLoading(editingUser ? 'Updating user...' : 'Creating user...');

    try {
      if (editingUser) {
        const payload = getUpdatePayload();
        await updateUserMutation.mutate({ id: editingUser.id, data: payload });
        logger.info('User updated', { userId: editingUser.id, payload });
        showSuccess('User updated successfully');
      } else {
        const payload = getCreatePayload();
        const result = await createUserMutation.mutate(payload);
        logger.info('User created', { userId: result.id, payload });
        showSuccess(`User created: ${result.name}`);
      }

      refetch();
      closeModal();
      resetForm();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to save user', { editing: Boolean(editingUser) }, err);
      showError(err?.message ?? 'Unable to save user');
      setIsSubmitting(false);
    } finally {
      removeNotification(loadingId);
    }
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    const loadingId = showLoading('Deleting user...');

    try {
      await deleteUserMutation.mutate({ id: userToDelete.id, deletedBy: 'current-user' });
      logger.info('User deleted', { userId: userToDelete.id });
      showSuccess('User deleted');
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to delete user', { userId: userToDelete.id }, err);
      showError(err?.message ?? 'Unable to delete user');
    } finally {
      removeNotification(loadingId);
      setIsSubmitting(false);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = useMemo(() => users, [users]);

  const columns = useMemo(() => {
    return [
      {
        key: 'name',
        header: 'Name',
        accessor: (user: User) => (
          <div>
            <div className="font-semibold text-text-primary">{user.name}</div>
            <div className="text-sm text-text-secondary">{user.email}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (user: User) => (
          <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>{user.status}</Badge>
        ),
      },
      {
        key: 'roles',
        header: 'Roles',
        accessor: (user: User) => (
          <div className="flex flex-wrap gap-1">
            {(user.roles ?? []).map((roleId) => {
              const role = roles.find((r) => r.id === roleId);
              return (
                <Badge key={roleId} variant="secondary">
                  {role?.name ?? roleId}
                </Badge>
              );
            })}
          </div>
        ),
      },
      {
        key: 'branches',
        header: 'Branches',
        accessor: (user: User) => (
          <div className="flex flex-wrap gap-1 text-sm">
            {(user.branchIds ?? []).length
              ? (user.branchIds ?? []).map((branchId) => {
                  const branch = branches.find((b) => b.id === branchId);
                  return (
                    <Badge key={branchId} variant="secondary">
                      {branch?.name ?? branchId}
                    </Badge>
                  );
                })
              : 'All branches'}
          </div>
        ),
      },
      {
        key: 'lastLogin',
        header: 'Last Login',
        accessor: (user: User) => {
          const raw = user.metadata?.lastLoginAt;
          let label = 'Never';
          if (raw) {
            const parsed = Date.parse(raw);
            label = Number.isNaN(parsed) ? raw : formatDate(parsed);
          }
          return <span className="text-sm text-text-secondary">{label}</span>;
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (user: User) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-error-600"
              onClick={() => confirmDelete(user)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ];
  }, [roles, branches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage staff accounts, roles, and permissions</p>
        </div>
        <Button onClick={openCreateModal}>New User</Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyExtractor={(user) => user.id}
            loading={loading}
          />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? 'Edit User' : 'New User'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              error={formErrors.name}
              required
            />
            <Input
              label="Email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              error={formErrors.email}
              required
            />
            <Input
              label="Phone"
              value={formState.phone ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              error={formErrors.phone}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Status</label>
              <div className="space-x-4">
                {(['active', 'inactive'] as User['status'][]).map((statusValue) => (
                  <label key={statusValue} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="user-status"
                      value={statusValue}
                      checked={formState.status === statusValue}
                      onChange={() => setFormState((prev) => ({ ...prev, status: statusValue }))}
                    />
                    {statusValue}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Roles *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {roles
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((role) => (
                  <Checkbox
                    key={role.id}
                    checked={formState.roles.includes(role.id)}
                    onChange={(event) => toggleRole(role.id, event.currentTarget.checked)}
                    label={role.name}
                  />
                ))}
            </div>
            {formErrors.roles && <p className="text-sm text-error mt-1">{formErrors.roles}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Branch Access</label>
            <p className="text-xs text-text-secondary mb-2">Leave empty for access to all branches.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {branches
                .filter((branch) => branch.isActive)
                .map((branch) => (
                  <Checkbox
                    key={branch.id}
                    checked={formState.branchIds.includes(branch.id)}
                    onChange={(event) => toggleBranch(branch.id, event.currentTarget.checked)}
                    label={branch.name}
                  />
                ))}
            </div>
          </div>

          <Input
            label="Notes"
            value={formState.notes ?? ''}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional notes"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-error-600 hover:bg-error-700" onClick={handleDelete} disabled={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


