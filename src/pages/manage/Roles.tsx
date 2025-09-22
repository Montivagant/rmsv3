import { useMemo, useState } from 'react';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import { useToast } from '../../hooks/useToast';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../../management/repository';
import { logger } from '../../shared/logger';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { DataTable } from '../../components/inventory/DataTable';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import type { DynamicRole, Permission } from '../../rbac/permissions';
import { SYSTEM_PERMISSIONS } from '../../rbac/permissions';

interface UpsertRoleInput {
  id?: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export default function RolesPage() {
  const { showToast } = useToast();
  const {
    data: rolesData,
    loading,
    error,
    refetch,
  } = useRepository<DynamicRole[]>(listRoles, []);
  const roles = rolesData ?? [];

  const createRoleMutation = useRepositoryMutation(({
    name,
    description,
    permissions,
    createdBy,
    isSystemRole = false,
  }: {
    name: string;
    description?: string;
    permissions: Permission[];
    createdBy: string;
    isSystemRole?: boolean;
  }) => createRole(name, description ?? '', permissions, createdBy, isSystemRole));

  const updateRoleMutation = useRepositoryMutation(({
    id,
    name,
    description,
    permissions,
  }: {
    id: string;
    name?: string;
    description?: string;
    permissions?: Permission[];
  }) => updateRole(id, {
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(permissions ? { permissions } : {}),
  }));

  const deleteRoleMutation = useRepositoryMutation((id: string) => deleteRole(id));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UpsertRoleInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNew = () => {
    setCurrentRole({ name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleEdit = (role: DynamicRole) => {
    setCurrentRole({
      id: role.id,
      name: role.name,
      ...(role.description ? { description: role.description } : {}),
      permissions: role.permissions,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentRole?.name?.trim() || !currentRole.permissions?.length) {
      showToast({ title: 'Role name and permissions are required', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    const trimmedName = currentRole.name.trim();
    const trimmedDescription = currentRole.description?.trim();

    try {
      if (currentRole.id) {
        await updateRoleMutation.mutate({
          id: currentRole.id,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
          permissions: currentRole.permissions,
        });
        logger.info('Role updated successfully', {
          roleId: currentRole.id,
          roleName: trimmedName,
        });
        showToast({
          title: 'Role updated',
          variant: 'success',
        });
      } else {
        await createRoleMutation.mutate({
          name: trimmedName,
          description: trimmedDescription ?? '',
          permissions: currentRole.permissions,
          createdBy: 'current-user',
        });
        logger.info('Role created successfully', { roleName: trimmedName });
        showToast({
          title: 'Role created',
          variant: 'success',
        });
      }

      setIsModalOpen(false);
      setCurrentRole(null);
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error(`Failed to ${currentRole.id ? 'update' : 'create'} role`, { role: currentRole }, err);
      showToast({
        title: 'Error',
        description: err?.message ?? 'Unable to save role',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    setIsSubmitting(true);
    try {
      await deleteRoleMutation.mutate(roleId);
      logger.info('Role deleted successfully', { roleId, roleName });
      showToast({ title: 'Role deleted', variant: 'success' });
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to delete role', { roleId }, err);
      showToast({
        title: 'Error',
        description: err?.message ?? 'Unable to delete role',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (!currentRole) return;

    const permission = SYSTEM_PERMISSIONS.find((p) => p.id === permissionId);
    if (!permission) return;

    const permissions = checked
      ? [...currentRole.permissions.filter((p) => p.id !== permission.id), permission]
      : currentRole.permissions.filter((p) => p.id !== permission.id);

    setCurrentRole((prev) =>
      prev
        ? {
            ...prev,
            permissions,
          }
        : prev,
    );
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Role Name',
        accessor: (row: DynamicRole) => row.name,
        sortable: true,
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (row: DynamicRole) => row.description || '-',
      },
      {
        key: 'permissions',
        header: 'Permissions',
        accessor: (row: DynamicRole) => `${row.permissions?.length || 0} enabled`,
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (row: DynamicRole) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(row)}
              disabled={row.isSystem}
            >
              Edit
            </Button>
            {!row.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error-600"
                onClick={() => handleDelete(row.id, row.name)}
              >
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const groupedPermissions = useMemo(
    () =>
      SYSTEM_PERMISSIONS.reduce((acc, permission) => {
        const module = permission.module.charAt(0).toUpperCase() + permission.module.slice(1);
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      }, {} as Record<string, Permission[]>),
    [],
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Roles</CardTitle>
            <Button onClick={handleNew}>New Role</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center p-6">
              <p className="text-error-600 mb-4">Failed to load roles: {error}</p>
              <Button onClick={refetch}>Retry</Button>
            </div>
          ) : (
            <DataTable data={roles} columns={columns} loading={loading} keyExtractor={(row) => row.id} />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentRole?.id ? 'Edit Role' : 'New Role'}>
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={currentRole?.name ?? ''}
            onChange={(e) =>
              setCurrentRole((prev) => (prev ? { ...prev, name: e.target.value } : prev))
            }
            required
          />
          <Input
            label="Description"
            value={currentRole?.description ?? ''}
            onChange={(e) =>
              setCurrentRole((prev) => (prev ? { ...prev, description: e.target.value } : prev))
            }
          />
          <div>
            <h3 className="font-semibold mb-2">Permissions</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto p-2 border rounded">
              {Object.entries(groupedPermissions).map(([moduleName, permissions]) => (
                <div key={moduleName}>
                  <h4 className="font-medium text-sm mb-2">{moduleName}</h4>
                  <div className="space-y-2 pl-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={currentRole?.permissions?.some((p) => p.id === permission.id) ?? false}
                          onChange={(e) => handlePermissionToggle(permission.id, e.currentTarget.checked)}
                        />
                        <label htmlFor={permission.id} className="text-sm">
                          {permission.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setCurrentRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSubmitting ||
                !currentRole?.name?.trim() ||
                !currentRole?.permissions?.length
              }
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
