import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { DataTable } from '../../components/inventory/DataTable';
import { StatusPill } from '../../components/inventory/StatusPill';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import type { ItemType } from '../../inventory/item-types/types';

export default function ItemTypesPage() {
  const { showToast } = useToast();
  const { data: itemTypes = [], loading, refetch } = useApi<ItemType[]>('/api/inventory/item-types', []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItemType, setCurrentItemType] = useState<Partial<ItemType> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNew = () => {
    setCurrentItemType({ name: '', description: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (itemType: ItemType) => {
    setCurrentItemType({ ...itemType });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentItemType) return;

    const isNew = !currentItemType.id;
    const url = isNew ? '/api/inventory/item-types' : `/api/inventory/item-types/${currentItemType.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    setIsSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentItemType),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save item type');
      }

      showToast({
        title: `Item type ${isNew ? 'created' : 'updated'}`,
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

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      accessor: (row: ItemType) => row.name,
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (row: ItemType) => row.description || '-',
    },
    {
      key: 'itemCount',
      header: 'Item Count',
      accessor: (row: ItemType) => row.itemCount,
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: ItemType) => (
        <StatusPill
          status={row.isActive ? 'success' : 'default'}
          label={row.isActive ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row: ItemType) => (
        <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
          Edit
        </Button>
      ),
    },
  ], []);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Item Types</CardTitle>
            <Button onClick={handleNew}>New Type</Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={itemTypes}
            columns={columns}
            loading={loading}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItemType?.id ? 'Edit Item Type' : 'New Item Type'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={currentItemType?.name || ''}
            onChange={(e) => setCurrentItemType(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Description"
            value={currentItemType?.description || ''}
            onChange={(e) => setCurrentItemType(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={currentItemType?.isActive ?? true}
              onChange={(e) => setCurrentItemType(prev => ({ ...prev, isActive: e.currentTarget.checked }))}
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
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

