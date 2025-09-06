import React, { useState } from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';
import { Button } from '../../components/Button';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import SupplierCreateModal from '../../components/suppliers/SupplierCreateModal';

interface Supplier {
  id: string;
  name: string;
  code?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export default function Suppliers() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: suppliers = [], loading, error, refetch } = useApi<Supplier[]>('/api/suppliers');
  const { data: existingCodes = [] } = useApi<string[]>('/api/suppliers/codes');
  const { showToast } = useToast();

  // Handle successful supplier creation
  const handleSupplierCreated = (supplierId: string) => {
    console.log('Supplier created successfully:', supplierId);
    refetch(); // Refresh the supplier list
    setIsCreateModalOpen(false);
    showToast('Supplier created successfully', 'success');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader 
          title="Suppliers"
          description="Manage supplier information and contacts"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading suppliers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Suppliers"
        description="Manage supplier information and contacts"
        actions={
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            Add Supplier
          </Button>
        }
      />
      
      <div className="flex-1 p-6">
        {suppliers.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              title="No Suppliers"
              description="Add suppliers to manage inventory sourcing and purchase orders."
              action={{
                label: "Add Supplier",
                onClick: () => setIsCreateModalOpen(true),
                variant: "primary"
              }}
            />
          </div>
        ) : (
          /* Suppliers Table */
          <div className="card">
            <div className="p-6">
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div 
                    key={supplier.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                        {supplier.code && (
                          <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                            {supplier.code}
                          </span>
                        )}
                      </div>
                      {supplier.contactPerson && (
                        <p className="text-sm text-muted-foreground mt-1">{supplier.contactPerson}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        {supplier.email && (
                          <span>{supplier.email}</span>
                        )}
                        {supplier.phone && (
                          <span>{supplier.phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        supplier.isActive 
                          ? 'bg-success/10 text-success' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Create Modal */}
      <SupplierCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSupplierCreated}
        existingCodes={existingCodes}
        isLoading={loading}
      />
    </div>
  );
}