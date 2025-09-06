import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function OrderHistory() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Order History"
        description="View and search through past orders"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M15.5 17.5L19 21l-1.5-1.5M15.5 17.5L12 14M15.5 17.5a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            }
            title="No Order History"
            description="Completed orders will appear here for review and reference."
          />
        </div>
      </div>
    </div>
  );
}