import { useMemo, useState } from 'react';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import { useToast } from '../../hooks/useToast';
import {
  listInventoryItemTypes,
  createInventoryItemType,
  updateInventoryItemType,
  type InventoryItemType,
} from '../../inventory/repository';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { DataTable } from '../../components/inventory/DataTable';
import { StatusPill } from '../../components/inventory/StatusPill';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';

interface UpsertItemTypeInput {
  id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export default function ItemTypesPage() {
  const { showToast } = useToast();
  const { data: itemTypesData, loading, refetch } = useRepository<InventoryItemType[]>(listInventoryItemTypes, []);
  const itemTypes = itemTypesData ?? [];

  const createItemTypeMutation = useRepositoryMutation(({ name, description }: { name: string; description?: string }) =>
    createInventoryItemType(name, description),
  );

  const updateItemTypeMutation = useRepositoryMutation(
    ({ id, name, description, isActive }: { id: string; name: string; description?: string; isActive?: boolean }) =>
      updateInventoryItemType(id, name, description, isActive),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItemType, setCurrentItemType] = useState<UpsertItemTypeInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNew = () => {
    setCurrentItemType({ name: '', description: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (itemType: InventoryItemType) => {
    const next: UpsertItemTypeInput = {
      id: itemType.id,
      name: itemType.name,
      ...(itemType.description ? { description: itemType.description } : {}),
      ...(typeof itemType.isActive === 'boolean' ? { isActive: itemType.isActive } : {}),
    };
    setCurrentItemType(next);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentItemType?.name?.trim()) {
      showToast({ title: 'Name is required', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedName = currentItemType.name.trim();
      const trimmedDescription = currentItemType.description?.trim();

      if (currentItemType.id) {
        const payload: { id: string; name: string; description?: string; isActive?: boolean } = {
          id: currentItemType.id,
          name: trimmedName,
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
          ...(typeof currentItemType.isActive === 'boolean' ? { isActive: currentItemType.isActive } : {}),
        };
        await updateItemTypeMutation.mutate(payload);
      } else {
        const payload: { name: string; description?: string } = {
          name: trimmedName,
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        };
        await createItemTypeMutation.mutate(payload);
      }

      showToast({
        title: `Item type ${currentItemType.id ? 'updated' : 'created'}`,
        variant: 'success',
      });
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to save item type',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (row: InventoryItemType) => row.name,
        sortable: true,
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (row: InventoryItemType) => row.description || '-',
      },
      {
        key: 'itemCount',
        header: 'Item Count',
        accessor: (row: InventoryItemType) => row.itemCount,
        sortable: true,
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row: InventoryItemType) => (
          <StatusPill status={row.isActive ? 'success' : 'default'} label={row.isActive ? 'Active' : 'Inactive'} />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (row: InventoryItemType) => (
          <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
            Edit
          </Button>
        ),
      },
    ],
    [],
  );

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
          <DataTable data={itemTypes} columns={columns} loading={loading} keyExtractor={(row) => row.id} />
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
            value={currentItemType?.name ?? ''}
            onChange={(e) =>
              setCurrentItemType((prev) => {
                const base: UpsertItemTypeInput = prev ?? { name: '', isActive: true };
                return { ...base, name: e.target.value };
              })
            }
            required
          />
          <Input
            label="Description"
            value={currentItemType?.description ?? ''}
            onChange={(e) =>
              setCurrentItemType((prev) => {
                const base: UpsertItemTypeInput = prev ?? { name: '', isActive: true };
                return { ...base, description: e.target.value };
              })
            }
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={currentItemType?.isActive ?? true}
              onChange={(e) =>
                setCurrentItemType((prev) => {
                  const base: UpsertItemTypeInput = prev ?? { name: '', isActive: true };
                  return { ...base, isActive: e.currentTarget.checked };
                })
              }
            />
            <label htmlFor="isActive" className="text-sm">
              Active
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
