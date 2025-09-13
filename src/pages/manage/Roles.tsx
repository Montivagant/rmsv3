import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { DataTable } from '../../components/inventory/DataTable';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import type { DynamicRole, Permission } from '../../rbac/permissions';
import { SYSTEM_PERMISSIONS } from '../../rbac/permissions';

export default function RolesPage() {
  const { showToast } = useToast();
  const { data: roles = [], loading, refetch } = useApi<DynamicRole[]>('/api/manage/roles', []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<DynamicRole> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNew = () => {
    setCurrentRole({ name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleEdit = (role: DynamicRole) => {
    setCurrentRole({ ...role });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentRole) return;

    const isNew = !currentRole.id;
    const url = isNew ? '/api/manage/roles' : `/api/manage/roles/${currentRole.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    setIsSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRole),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save role');
      }

      showToast({
        title: `Role ${isNew ? 'created' : 'updated'}`,
        variant: 'success',
      });
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (!currentRole) return;

    let newPermissions = [...(currentRole.permissions || [])];
    if (checked) {
      const permission = SYSTEM_PERMISSIONS.find(p => p.id === permissionId);
      if (permission) {
        newPermissions.push(permission);
      }
    } else {
      newPermissions = newPermissions.filter(p => p.id !== permissionId);
    }
    setCurrentRole(prev => ({ ...prev, permissions: newPermissions }));
  };

  const columns = useMemo(() => [
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
        <Button variant="outline" size="sm" onClick={() => handleEdit(row)} disabled={row.isSystem}>
          Edit
        </Button>
      ),
    },
  ], []);

  const groupedPermissions = useMemo(() => {
    return SYSTEM_PERMISSIONS.reduce((acc, permission) => {
      const module = permission.module.charAt(0).toUpperCase() + permission.module.slice(1);
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, []);

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
          <DataTable
            data={roles}
            columns={columns}
            loading={loading}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentRole?.id ? 'Edit Role' : 'New Role'}
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={currentRole?.name || ''}
            onChange={(e) => setCurrentRole(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Description"
            value={currentRole?.description || ''}
            onChange={(e) => setCurrentRole(prev => ({ ...prev, description: e.target.value }))}
          />
          <div>
            <h3 className="font-semibold mb-2">Permissions</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto p-2 border rounded">
              {Object.entries(groupedPermissions).map(([moduleName, permissions]) => (
                <div key={moduleName}>
                  <h4 className="font-medium text-sm mb-2">{moduleName}</h4>
                  <div className="space-y-2 pl-2">
                    {permissions.map(permission => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={currentRole?.permissions?.some(p => p.id === permission.id) ?? false}
                          onChange={(e) => handlePermissionToggle(permission.id, e.currentTarget.checked)}
                        />
                        <label htmlFor={permission.id} className="text-sm">{permission.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSubmitting}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
