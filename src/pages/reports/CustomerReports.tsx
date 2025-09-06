import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function CustomerReports() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Customer Analytics"
        description="Analyze customer behavior and loyalty metrics"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            title="No Customer Data"
            description="Customer analytics will be available once customer data is collected."
          />
        </div>
      </div>
    </div>
  );
}