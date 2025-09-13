/**
 * Manage Branches Page
 * 
 * CRUD interface for managing restaurant branches/locations
 */

import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { branchService } from '../../services/branch';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { SkeletonCard } from '../../components/feedback/LoadingSpinner';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import { BranchForm } from '../../components/branches/BranchForm';
import type { Branch, BranchFormData } from '../../types/branch';
import { FaBuilding, FaWarehouse, FaUtensils, FaPlus, FaEdit, FaTrash, FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaBoxes } from 'react-icons/fa';

export default function Branches() {
  const { data: branches, loading, error, refetch } = useApi<Branch[]>('/api/manage/branches', []);
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (data: BranchFormData) => {
    setIsSubmitting(true);
    const loadingId = showLoading('Creating branch...');
    
    try {
      await branchService.create(data);
      showSuccess('Branch created successfully');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      removeNotification(loadingId);
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: BranchFormData) => {
    if (!editingBranch) return;
    
    setIsSubmitting(true);
    const loadingId = showLoading('Updating branch...');
    
    try {
      await branchService.update(editingBranch.id, data);
      showSuccess('Branch updated successfully');
      setEditingBranch(null);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update branch');
    } finally {
      removeNotification(loadingId);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    
    const loadingId = showLoading('Deleting branch...');
    
    try {
      await branchService.delete(deletingBranch.id);
      showSuccess('Branch deleted successfully');
      setDeletingBranch(null);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete branch');
    } finally {
      removeNotification(loadingId);
    }
  };

  const handleSetAsMain = async (branch: Branch) => {
    const loadingId = showLoading('Setting as main branch...');
    
    try {
      await branchService.setAsMain(branch.id);
      showSuccess(`${branch.name} is now the main branch`);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to set as main branch');
    } finally {
      removeNotification(loadingId);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    const loadingId = showLoading(`${branch.isActive ? 'Deactivating' : 'Activating'} branch...`);
    
    try {
      await branchService.toggleActive(branch.id, !branch.isActive);
      showSuccess(`Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update branch status');
    } finally {
      removeNotification(loadingId);
    }
  };

  const getBranchIcon = (type: Branch['type']) => {
    switch (type) {
      case 'restaurant':
        return <FaUtensils className="text-brand-600" />;
      case 'warehouse':
        return <FaWarehouse className="text-success-600" />;
      case 'commissary':
        return <FaBuilding className="text-warning-600" />;
      default:
        return <FaBuilding className="text-text-tertiary" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary">Manage Branches</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent>
            <p className="text-error-600">Failed to load branches: {error.message}</p>
            <Button onClick={refetch} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Manage Branches</h1>
        <Button onClick={() => setShowCreateModal(true)} icon={<FaPlus />} iconPosition="left">
          Add Branch
        </Button>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(branch => (
          <Card key={branch.id} className={!branch.isActive ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getBranchIcon(branch.type)}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {branch.name}
                      {branch.isMain && (
                        <FaStar className="text-warning-500" title="Main Branch" />
                      )}
                    </CardTitle>
                    <p className="text-sm text-text-secondary capitalize">{branch.type}</p>
                  </div>
                </div>
                <Badge 
                  variant={branch.isActive ? 'success' : 'warning'}
                  size="sm"
                >
                  {branch.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address */}
              <div className="flex items-start gap-2 text-sm">
                <FaMapMarkerAlt className="text-text-tertiary mt-0.5" />
                <div className="text-text-secondary">
                  <p>{branch.address.street}</p>
                  <p>
                    {branch.address.city}
                    {branch.address.state && `, ${branch.address.state}`}
                    {branch.address.postalCode && ` ${branch.address.postalCode}`}
                  </p>
                  <p>{branch.address.country}</p>
                </div>
              </div>

              {/* Contact Info */}
              {branch.contact && (
                <div className="space-y-2 text-sm">
                  {branch.contact.phone && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FaPhone className="text-text-tertiary" />
                      <span>{branch.contact.phone}</span>
                    </div>
                  )}
                  {branch.contact.email && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FaEnvelope className="text-text-tertiary" />
                      <span>{branch.contact.email}</span>
                    </div>
                  )}
                  {branch.contact.manager && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FaUser className="text-text-tertiary" />
                      <span>{branch.contact.manager}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Storage Areas */}
              {branch.storageAreas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                    <FaBoxes className="text-text-tertiary" />
                    <span>Storage Areas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {branch.storageAreas.map(area => (
                      <Badge key={area} variant="secondary" size="sm">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-text-secondary pt-2 border-t">
                <span>{branch.metadata.itemCount || 0} items</span>
                <span>{branch.metadata.employeeCount || 0} employees</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!branch.isMain && branch.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSetAsMain(branch)}
                    title="Set as main branch"
                  >
                    <FaStar />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingBranch(branch)}
                >
                  <FaEdit />
                </Button>
                {!branch.isMain && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingBranch(branch)}
                    className="text-error-600 hover:text-error-700"
                  >
                    <FaTrash />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActive(branch)}
                  className="ml-auto"
                >
                  {branch.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Branch"
        size="lg"
      >
        <BranchForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingBranch}
        onClose={() => setEditingBranch(null)}
        title="Edit Branch"
        size="lg"
      >
        {editingBranch && (
          <BranchForm
            branch={editingBranch}
            onSubmit={handleUpdate}
            onCancel={() => setEditingBranch(null)}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        title="Delete Branch"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{deletingBranch?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeletingBranch(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-error-600 hover:bg-error-700"
              onClick={handleDelete}
            >
              Delete Branch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}