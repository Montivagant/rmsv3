import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function SalesReports() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Sales Reports"
        description="View sales performance and revenue analytics"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="No Sales Data"
            description="Sales reports will appear here once transactions are processed through the POS."
          />
        </div>
      </div>
    </div>
  );
}