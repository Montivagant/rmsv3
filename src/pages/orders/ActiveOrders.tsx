import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function ActiveOrders() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Active Orders"
        description="View and manage currently active orders"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No Active Orders"
            description="Active orders will appear here when customers place orders through the POS system."
          />
        </div>
      </div>
    </div>
  );
}