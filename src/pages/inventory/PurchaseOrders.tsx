import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function PurchaseOrders() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Purchase Orders"
        description="Create and manage inventory purchase orders"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="No Purchase Orders"
            description="Create purchase orders to restock inventory from suppliers."
            action={{
              label: "Create Purchase Order",
              onClick: () => console.log("Create purchase order clicked"),
              variant: "primary"
            }}
          />
        </div>
      </div>
    </div>
  );
}