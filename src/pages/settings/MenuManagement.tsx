import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function MenuManagement() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Menu Management"
        description="Configure menu items, categories, and pricing"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="Menu Configuration"
            description="Set up your restaurant menu with categories, items, and pricing."
            action={{
              label: "Add Menu Item",
              onClick: () => console.log("Add menu item clicked"),
              variant: "primary"
            }}
          />
        </div>
      </div>
    </div>
  );
}