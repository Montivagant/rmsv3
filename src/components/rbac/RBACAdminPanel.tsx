import React, { useState, useEffect, useMemo } from 'react';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  SmartForm, 
  useNotifications 
} from '../index';
import type { FormField } from '../forms/SmartForm';
import { DynamicRBACService } from '../../rbac/dynamicRBACService';
import { 
  SYSTEM_PERMISSIONS 
} from '../../rbac/permissions';
import type { 
  DynamicRole, 
  Permission, 
  PermissionScope 
} from '../../rbac/permissions';
import { usePermissions } from '../../rbac/dynamicGuard';
import { cn } from '../../lib/utils';
import { UserAssignmentTab } from './UserAssignmentTab';
import { FORM_LABELS } from '../../constants/ui-text';

interface RBACAdminPanelProps {
  className?: string;
}

interface RoleFormData {
  name: string;
  description: string;
  permissionIds: string[];
  inheritsFrom?: string[];
}

export function RBACAdminPanel({ className }: RBACAdminPanelProps) {
  const { hasPermission } = usePermissions();
  const { showSuccess, showError } = useNotifications();
  
  // State management
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<DynamicRole | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'roles' | 'permissions' | 'assignments'>('roles');

  const rbacService = DynamicRBACService.getInstance();

  // Check if user has permission to manage RBAC
  const canManageRoles = hasPermission('settings.role_management');
  const canManageUsers = hasPermission('settings.user_management');

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const allRoles = await rbacService.getAllRoles();
      setRoles(allRoles);
    } catch (error) {
      showError('Failed to Load Roles', 'Could not retrieve role information');
    } finally {
      setLoading(false);
    }
  };

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

  // Group permissions by module for better organization
  const permissionsByModule = useMemo(() => {
    const grouped = SYSTEM_PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
    
    return grouped;
  }, []);

  // Handle role creation
  const handleCreateRole = async (data: RoleFormData) => {
    try {
      await rbacService.createRole(data);
      await loadRoles();
      setIsCreateModalOpen(false);
      showSuccess('Role Created', `${data.name} has been created successfully`);
    } catch (error: any) {
      showError('Failed to Create Role', error.message || 'Could not create role');
      throw error;
    }
  };

  // Handle role update
  const handleUpdateRole = async (data: RoleFormData) => {
    if (!selectedRole) return;
    
    try {
      await rbacService.updateRole(selectedRole.id, {
        name: data.name,
        description: data.description,
        permissionIds: data.permissionIds
      });
      await loadRoles();
      setIsEditModalOpen(false);
      setSelectedRole(null);
      showSuccess('Role Updated', `${data.name} has been updated successfully`);
    } catch (error: any) {
      showError('Failed to Update Role', error.message || 'Could not update role');
      throw error;
    }
  };

  // Handle role deletion
  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    try {
      await rbacService.deleteRole(selectedRole.id);
      await loadRoles();
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
      showSuccess('Role Deleted', `${selectedRole.name} has been deleted`);
    } catch (error: any) {
      showError('Failed to Delete Role', error.message || 'Could not delete role');
    }
  };

  // Get role form fields
  const getRoleFormFields = (role?: DynamicRole): FormField[] => [
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
      type: 'textarea',
      required: true,
      placeholder: 'Select permissions for this role...',
      helpText: 'Use the multi-select interface below to assign permissions to this role'
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

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: 'roles', label: 'Roles', icon: '👥' },
            { id: 'permissions', label: 'Permissions', icon: '🔐' },
            { id: 'assignments', label: 'User Assignments', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                selectedTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Roles Tab */}
      {selectedTab === 'roles' && (
        <>
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

          {/* Roles Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded mb-4" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">No roles found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'No roles have been created yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map(role => (
                <div key={role.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        role.isSystem 
                          ? 'bg-surface-secondary text-brand' 
                          : 'bg-success text-success'
                      )}>
                        {role.isSystem ? 'System' : 'Custom'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Permissions:</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                    {role.inheritsFrom && role.inheritsFrom.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Inherits from:</span>
                        <span className="font-medium">{role.inheritsFrom.length} role(s)</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Permissions Tab */}
      {selectedTab === 'permissions' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Available Permissions</h3>
          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, permissions]) => (
              <div key={module} className="bg-card border border-border rounded-lg p-6">
                <h4 className="font-semibold mb-4 text-primary capitalize">{module} Module</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissions.map(permission => (
                    <div key={permission.id} className="border border-border rounded-lg p-4">
                      <h5 className="font-medium">{permission.name}</h5>
                      <p className="text-sm text-muted-foreground mb-2">{permission.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-muted rounded">
                          {permission.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {permission.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Assignments Tab */}
      {selectedTab === 'assignments' && (
        <UserAssignmentTab 
          canManageUsers={canManageUsers}
          rbacService={rbacService}
          onUserRoleChange={() => {
            loadRoles();
            showSuccess('User role updated', 'Role assignment has been updated successfully');
          }}
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
          onSubmit={handleCreateRole}
          submitLabel={FORM_LABELS.CREATE_ROLE}
          onCancel={() => setIsCreateModalOpen(false)}
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
            fields={getRoleFormFields(selectedRole)}
            onSubmit={handleUpdateRole}
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