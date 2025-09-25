import { useState, useMemo } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  SmartForm,
  useNotifications,
  DataTable
} from '../index';
import type { FormField } from '../forms/SmartForm';
import {
  SYSTEM_PERMISSIONS
} from '../../rbac/permissions';
import type {
  DynamicRole,
  Permission,
} from '../../rbac/permissions';
import { usePermissions } from '../../rbac/dynamicGuard';
import { cn } from '../../lib/utils';
import { FORM_LABELS } from '../../constants/ui-text';

import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../../management/repository';

const formatModuleLabel = (module: string): string => {
  return module
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const PERMISSION_OPTION_GROUPS = Object.entries(
  SYSTEM_PERMISSIONS.reduce<Record<string, { label: string; options: { value: string; label: string; description?: string }[] }>>((groups, permission) => {
    const key = permission.module;
    if (!groups[key]) {
      groups[key] = {
        label: formatModuleLabel(key),
        options: []
      };
    }
    groups[key].options.push({
      value: permission.id,
      label: permission.name,
      description: permission.description
    });
    return groups;
  }, {})
)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([_, group]) => ({
    label: group.label,
    options: group.options.sort((a, b) => a.label.localeCompare(b.label))
  }));
interface RBACAdminPanelProps {
  className?: string;
}

interface RoleFormData {
  name: string;
  description: string;
  permissionIds: string[];
}

export function RBACAdminPanel({ className }: RBACAdminPanelProps) {
  const { showSuccess, showError } = useNotifications();

  // Use real repository functions instead of in-memory service
  const {
    data: rolesData,
    loading,
    error,
    refetch,
  } = useRepository<DynamicRole[]>(listRoles, []);

  const roles = rolesData ?? [];
  const [selectedRole, setSelectedRole] = useState<DynamicRole | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // Repository mutations with real backend integration
  const createRoleMutation = useRepositoryMutation(({
    name,
    description,
    permissions,
    createdBy,
  }: {
    name: string;
    description?: string;
    permissions: Permission[];
    createdBy: string;
  }) => createRole(name, description ?? '', permissions, createdBy, false));

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

  // Check if user has permission to manage RBAC
  const { hasPermission: canManageRoles } = usePermissions();

  // Filter roles based on search and type
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch = !searchTerm ||
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterType === 'all' ||
        (filterType === 'system' && role.isSystem) ||
        (filterType === 'custom' && !role.isSystem);

      return matchesSearch && matchesFilter;
    });
  }, [roles, searchTerm, filterType]);


  // Handle role creation with real backend integration
  const handleCreateRole = async (data: RoleFormData) => {
    const permissionIds = Array.isArray(data.permissionIds)
      ? data.permissionIds
      : data.permissionIds
        ? [data.permissionIds]
        : [];
    const uniquePermissionIds = Array.from(new Set(permissionIds)).filter(Boolean);

    if (uniquePermissionIds.length === 0) {
      showError('Permissions Required', 'Select at least one permission for the role');
      return;
    }

    try {
      const permissions = SYSTEM_PERMISSIONS.filter(p => uniquePermissionIds.includes(p.id));
      await createRoleMutation.mutate({
        name: data.name,
        description: data.description,
        permissions,
        createdBy: 'current-user'
      });
      await refetch();
      setIsCreateModalOpen(false);
      showSuccess('Role Created', `${data.name} has been created successfully`);
    } catch (error: any) {
      showError('Failed to Create Role', error.message || 'Could not create role');
      throw error;
    }
  };

  // Handle role update with real backend integration
  const handleUpdateRole = async (data: RoleFormData) => {
    if (!selectedRole) return;

    const permissionIds = Array.isArray(data.permissionIds)
      ? data.permissionIds
      : data.permissionIds
        ? [data.permissionIds]
        : [];
    const uniquePermissionIds = Array.from(new Set(permissionIds)).filter(Boolean);

    if (uniquePermissionIds.length === 0) {
      showError('Permissions Required', 'Select at least one permission for the role');
      return;
    }

    try {
      const permissions = SYSTEM_PERMISSIONS.filter(p => uniquePermissionIds.includes(p.id));
      await updateRoleMutation.mutate({
        id: selectedRole.id,
        name: data.name,
        description: data.description,
        permissions
      });
      await refetch();
      setIsEditModalOpen(false);
      setSelectedRole(null);
      showSuccess('Role Updated', `${data.name} has been updated successfully`);
    } catch (error: any) {
      showError('Failed to Update Role', error.message || 'Could not update role');
      throw error;
    }
  };

  // Handle role deletion with real backend integration
  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isSystem) return;

    const roleName = selectedRole.name;

    try {
      await deleteRoleMutation.mutate(selectedRole.id);
      await refetch();
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
      showSuccess('Role Deleted', `${roleName} has been deleted`);
    } catch (error: any) {
      showError('Failed to Delete Role', error.message || 'Could not delete role');
    }
  };

  // Get role form fields
  const getRoleFormFields = (): FormField[] => [
    {
      name: 'name',
      label: 'Role Name',
      type: 'text',
      required: true,
      placeholder: 'Enter role name...',
      helpText: 'A descriptive name for this role'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe what this role can do...',
      helpText: 'Detailed description of the role responsibilities'
    },
    {
      name: 'permissionIds',
      label: 'Permissions',
      type: 'checkbox-group',
      required: true,
      helpText: 'Select the permissions that should be granted to this role',
      optionGroups: PERMISSION_OPTION_GROUPS
    }
  ];

  if (!canManageRoles) {
    return (
      <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
        <div className="text-center">
          <div className="text-muted-foreground mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Role & Permission Management</h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions for the restaurant management system
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!canManageRoles}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'system', label: 'System Roles' },
            { value: 'custom', label: 'Custom Roles' }
          ]}
        />
      </div>

      {/* Roles DataTable */}
      {error ? (
        <div className="text-center p-6">
          <p className="text-error-600 mb-4">Failed to load roles: {error}</p>
          <Button onClick={refetch}>Retry</Button>
        </div>
      ) : (
        <DataTable<DynamicRole>
          data={filteredRoles}
          columns={[
            {
              id: 'name',
              header: 'Role Name',
              accessorKey: 'name',
              enableSorting: true,
            },
            {
              id: 'description',
              header: 'Description',
              accessorFn: (row: DynamicRole) => row.description || '-',
            },
            {
              id: 'permissions',
              header: 'Permissions',
              accessorFn: (row: DynamicRole) => `${row.permissions?.length || 0} enabled`,
            },
            {
              id: 'type',
              header: 'Type',
              accessorFn: (row: DynamicRole) => (row.isSystem ? 'System' : 'Custom'),
            },
            {
              id: 'actions',
              header: 'Actions',
              enableSorting: false,
              cell: ({ row }) => {
                const role = row.original;
                return (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsEditModalOpen(true);
                      }}
                      disabled={role.isSystem}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsDeleteModalOpen(true);
                      }}
                      disabled={role.isSystem}
                      className="text-error-600 hover:text-error-700"
                    >
                      Delete
                    </Button>
                  </div>
                );
              },
            },
          ]}
          loading={loading}
          rowKey={(row: DynamicRole) => row.id}
        />
      )}


      {/* Create Role Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Role"
        size="lg"
      >
        <SmartForm
          fields={getRoleFormFields()}
          initialValues={{ name: '', description: '', permissionIds: [] }}
          onSubmit={(data) => handleCreateRole(data as unknown as RoleFormData)}
          submitLabel={FORM_LABELS.CREATE_ROLE}
          onCancel={() => setIsCreateModalOpen(false)}
          title="New Role"
          description="Create a custom role by assigning the permissions it should have."
        />
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRole(null);
        }}
        title={FORM_LABELS.EDIT}
        size="lg"
      >
        {selectedRole && (
          <SmartForm
            fields={getRoleFormFields()}
            onSubmit={(data) => handleUpdateRole(data as unknown as RoleFormData)}
            submitLabel={FORM_LABELS.UPDATE_ROLE}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedRole(null);
            }}
            initialValues={{
              name: selectedRole.name,
              description: selectedRole.description,
              permissionIds: selectedRole.permissions.map(p => p.id)
            }}
            title="Edit Role"
            description="Update the role details and adjust the permissions it should include."
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRole(null);
        }}
        title={FORM_LABELS.DELETE_ROLE}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete the role "{selectedRole?.name}"? 
            This action cannot be undone and will remove the role from all users.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRole}
            >
              Delete Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
