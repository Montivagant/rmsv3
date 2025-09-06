import React from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';

export default function TaxSettings() {
  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Tax Settings"
        description="Configure tax rates and tax-related options"
      />
      
      <div className="flex-1 p-6">
        <div className="card p-8">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            title="Tax Configuration"
            description="Set up tax rates, exemptions, and calculation rules for your location."
            action={{
              label: "Configure Tax Rates",
              onClick: () => console.log("Configure tax clicked"),
              variant: "primary"
            }}
          />
        </div>
      </div>
    </div>
  );
}