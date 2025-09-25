/**
 * Menu Modifiers Management
 * Create and manage modifier groups for menu customization
 */

import { useState, useCallback } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../components/DropdownMenu';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import ModifierGroupModal from '../../components/menu/ModifierGroupModal';
import { 
  listModifierGroups, 
  deleteModifierGroup,
  type ModifierGroup 
} from '../../menu/modifiers/repository';

// Interfaces now imported from repository

export default function Modifiers() {
  const { showToast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Repository data loading
  const { data: modifierGroups = [], loading, error, refetch } = useRepository(listModifierGroups, []);
  
  // Repository mutations
  const deleteGroupMutation = useRepositoryMutation(
    ({ id, reason }: { id: string; reason?: string }) => deleteModifierGroup(id, reason)
  );

  // Filter groups by search term (with null safety)
  const filteredGroups = (modifierGroups || []).filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Event handlers
  const handleCreateGroup = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleGroupCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    refetch();
    showToast({
      title: 'Success',
      description: 'Modifier group created successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleEditGroup = useCallback((group: ModifierGroup) => {
    setSelectedGroup(group);
    setIsEditModalOpen(true);
  }, []);

  const handleGroupUpdated = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedGroup(null);
    refetch();
    showToast({
      title: 'Success',
      description: 'Modifier group updated successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleDeleteGroup = useCallback(async (group: ModifierGroup) => {
    if (!confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteGroupMutation.mutate({ id: group.id, reason: 'Deleted by user' });

      refetch();
      showToast({
        title: 'Success',
        description: 'Modifier group deleted successfully',
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete modifier group',
        variant: 'error'
      });
    }
  }, [refetch, showToast, deleteGroupMutation]);

  // Loading state
  if (loading && (!modifierGroups || modifierGroups.length === 0)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-error mb-4">Failed to load modifier groups</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary mb-1">Menu Modifiers</h1>
          <p className="text-body text-secondary">
            Create modifier groups to allow menu item customization
          </p>
        </div>
        <Button 
          onClick={handleCreateGroup}
          className="min-h-[44px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Modifier Group
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search modifier groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-text-muted">
              {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modifier Groups */}
      {filteredGroups.length === 0 && !loading ? (
        <EmptyState
          title="No modifier groups found"
          description={searchTerm ? "No groups match your search." : "Create your first modifier group to enable menu customization."}
          action={{
            label: "Create Modifier Group",
            onClick: handleCreateGroup
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Card 
              key={group.id}
              className={cn(
                "hover:shadow-md transition-shadow",
                !group.isActive && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary mb-1">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-text-muted mb-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Badge variant={group.type === 'single' ? 'secondary' : 'primary'} size="sm">
                        {group.type === 'single' ? 'Single Choice' : 'Multiple Choice'}
                      </Badge>
                      {group.isRequired && (
                        <Badge variant="warning" size="sm">Required</Badge>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions for ${group.name}`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </Button>
                    }
                  >
                    <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteGroup(group)}
                      className="text-error"
                    >
                      Delete Group
                    </DropdownMenuItem>
                  </DropdownMenu>
                </div>

                {/* Options Preview */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-text-secondary mb-1">
                    Options ({group.options.length}):
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {group.options.slice(0, 3).map((option) => (
                      <div key={option.id} className="flex justify-between text-xs">
                        <span className="text-text-primary">{option.name}</span>
                        <span className="text-text-secondary">
                          {option.priceAdjustment >= 0 ? '+' : ''}${option.priceAdjustment.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {group.options.length > 3 && (
                      <div className="text-xs text-text-muted">
                        +{group.options.length - 3} more options
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <Badge 
                    variant={group.isActive ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {group.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {group.minSelections === group.maxSelections 
                      ? `Select ${group.minSelections}`
                      : `Select ${group.minSelections}-${group.maxSelections}`
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modifier Group Modal */}
      <ModifierGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleGroupCreated}
      />

      {/* Edit Modifier Group Modal */}
      {selectedGroup && (
        <ModifierGroupModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedGroup(null);
          }}
          onSuccess={handleGroupUpdated}
          editingGroup={selectedGroup}
        />
      )}
    </div>
  );
}
