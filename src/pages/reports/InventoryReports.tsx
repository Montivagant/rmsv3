import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function InventoryReports() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Inventory Reports"
        description="Track inventory levels, movements, and costs"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            title="No Inventory Data"
            description="Inventory reports will be generated based on stock movements and current levels."
          />
        </div>
      </div>
    </div>
  );
}