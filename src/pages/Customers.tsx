import React, { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Label,
  FormField,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components';
import { useRepository, useRepositoryMutation } from '../hooks/useRepository';
import { CustomerFilters } from '../customers/CustomerFilters';
import { CustomerTable } from '../customers/CustomerTable';
import { CustomerProfileDrawer } from '../customers/CustomerProfileDrawer';
import { BulkActionsBar } from '../customers/BulkActionsBar';
import { useCustomerQueryState } from '../customers/useCustomerQueryState';
import { listCustomers, upsertCustomerProfile, type UpsertCustomerInput } from '../customers/repository';
import type { Customer, CustomersResponse, CustomerFilters as Filters } from '../customers/types';

// Simple validation helpers
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) =>
  /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone.replace(/[\s\-()]/g, ''));

export default function Customers() {
  const { state, setState, searchInput, setSearchInput } = useCustomerQueryState();

  // Repository hooks
  const { data: allCustomers, loading, error: repositoryError, refetch } = useRepository(
    listCustomers,
    []
  );
  const createCustomerMutation = useRepositoryMutation(upsertCustomerProfile);

  // Client-side filtering, sorting, and pagination
  const data = useMemo<CustomersResponse>(() => {
    if (!allCustomers) {
      return { data: [], page: state.page, pageSize: state.pageSize, total: 0 };
    }

    let filtered = allCustomers;

    // Apply search filter
    if (state.search?.trim()) {
      const query = state.search.trim().toLowerCase();
      filtered = filtered.filter(customer => {
        const haystack = `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    // Apply sorting
    if (state.sort) {
      const [column, dir = 'asc'] = state.sort.split(':');
      const multiplier = dir === 'desc' ? -1 : 1;
      filtered = [...filtered].sort((a, b) => {
        switch (column) {
          case 'totalSpent':
            return ((a.totalSpent ?? 0) - (b.totalSpent ?? 0)) * multiplier;
          case 'orders':
            return ((a.orders ?? 0) - (b.orders ?? 0)) * multiplier;
          case 'points':
            return ((a.points ?? 0) - (b.points ?? 0)) * multiplier;
          case 'name':
          default:
            return a.name.localeCompare(b.name) * multiplier;
        }
      });
    }

    // Apply pagination
    const startIndex = (state.page - 1) * state.pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + state.pageSize);

    // Convert to Customer format (matching the original API response format)
    return {
      data: paginatedData.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        points: customer.points,
        orders: customer.orders,
        totalSpent: customer.totalSpent,
        // Note: visits, lastVisit, tags not available in Customer type
        // visits: customer.visits,
        // lastVisit: customer.lastVisit,
        // tags: customer.tags,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      })),
      page: state.page,
      pageSize: state.pageSize,
      total: filtered.length
    };
  }, [allCustomers, state.search, state.sort, state.page, state.pageSize]);

  const error = repositoryError;

  // Profile drawer state
  const [openProfile, setOpenProfile] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  // Add customer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Bulk selection state
  const [bulkSelected, setBulkSelected] = useState<Customer[]>([]);
  const [bulkCount, setBulkCount] = useState<number>(0);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);

  // Bulk actions state
  // Simplified: remove tag and status bulk actions
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<null>(null);
  const [isBulkProcessing] = useState(false);

  // Listen for profile updates and refresh data so edits reflect immediately
  React.useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener('customers:updated', handler);
    return () => window.removeEventListener('customers:updated', handler);
  }, [refetch]);

  // Derived
  const hasAnyFilter = useMemo(
    () => state.search || (state.filters && Object.keys(state.filters).length > 0),
    [state.search, state.filters]
  );

  // Add Customer
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!validateEmail(formData.email)) errors.email = 'Please enter a valid email address';
    if (formData.phone && !validatePhone(formData.phone)) errors.phone = 'Please enter a valid phone number';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsAddingCustomer(true);
    try {
      // Generate a unique customer ID
      const customerId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      const customerData: UpsertCustomerInput = {
        id: customerId,
        name: formData.name.trim(),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() }),
      };
      
      await createCustomerMutation.mutate(customerData);
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '' });
      setFormErrors({});
      // Reset to first page to see the new entry
      setState({ page: 1 });
      refetch(); // Refresh data from repository
    } catch (error) {
      setFormErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to add customer. Please try again.'
      });
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Bulk helpers
  const exportCSV = () => {
    if (bulkSelected.length === 0) return;
    const headers = [
      'id','name','email','phone','orders','totalSpent','visits','points','lastVisit','status','tags'
    ];
    const rows = bulkSelected.map(c => ([
      c.id,
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      `"${(c.email ?? '').replace(/"/g, '""')}"`,
      `"${(c.phone ?? '').replace(/"/g, '""')}"`,
      c.orders ?? 0,
      c.totalSpent?.toFixed ? c.totalSpent.toFixed(2) : c.totalSpent ?? 0,
      0, // visits not available
      c.points ?? 0,
      '', // lastVisit not available
      '', // status not available
      '""' // tags not available,
    ].join(',')));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // After export, clear selection to match expected UX in tests
    setBulkSelected([]);
    setBulkCount(0);
    setClearSelectionSignal((n) => n + 1);
  };

  const applyTag = async () => { setShowTagModal(false); };

  const bulkUpdateStatus = async () => { setConfirmAction(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Customers</h1>
          <p className="text-secondary">Manage customer profiles and loyalty (read-only in list)</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Customer</Button>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer"
        description="Create a new customer account"
      >
        <form onSubmit={addCustomer} className="space-y-form">
          <FormField error={formErrors.name} required>
            <Label htmlFor="name" required>
              Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter customer name"
              error={formErrors.name}
            />
          </FormField>

          <FormField error={formErrors.email} required>
            <Label htmlFor="email" required>
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
              error={formErrors.email}
            />
          </FormField>

          <FormField error={formErrors.phone}>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              error={formErrors.phone}
            />
          </FormField>

          {formErrors.submit && <div className="text-error text-body-sm">{formErrors.submit}</div>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} disabled={isAddingCustomer}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingCustomer}>
              {isAddingCustomer ? 'Adding…' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Tag Modal */}
      <Modal
        isOpen={showTagModal}
        onClose={() => {
          if (!isBulkProcessing) {
            setShowTagModal(false);
            setTagValue('');
          }
        }}
        title="Add Tag to Selected Customers"
        description="Enter a tag to add to all selected customers"
      >
        <div className="space-y-form">
          <FormField>
            <Label htmlFor="bulk-tag">Tag</Label>
            <Input
              id="bulk-tag"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              placeholder="e.g., vip"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTagModal(false);
                setTagValue('');
              }}
              disabled={isBulkProcessing}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyTag} disabled={isBulkProcessing || !tagValue.trim()}>
              {isBulkProcessing ? 'Applying…' : 'Apply Tag'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Activate/Deactivate Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => (!isBulkProcessing ? setConfirmAction(null) : undefined)}
        title={confirmAction === 'deactivate' ? 'Deactivate Customers' : 'Activate Customers'}
        description={
          confirmAction === 'deactivate'
            ? 'Are you sure you want to mark the selected customers as inactive?'
            : 'Are you sure you want to mark the selected customers as active?'
        }
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={isBulkProcessing}>
            Cancel
          </Button>
          <Button
            onClick={bulkUpdateStatus}
            disabled={isBulkProcessing}
          >
            {isBulkProcessing ? 'Updating…' : 'Confirm'}
          </Button>
        </div>
      </Modal>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search &amp; Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerFilters
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            filters={state.filters}
            onChange={(next: Filters) => setState({ filters: next, page: 1 })}
            onReset={() => setState({ filters: {}, search: '', page: 1 })}
          />
          {hasAnyFilter && (
            <div className="text-xs text-text-secondary mt-2">Results update automatically (debounced 300ms)</div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {error ? (
        <div className="text-center py-8">
          <p className="text-error">Error loading customers: {error}</p>
          <Button onClick={refetch} className="mt-4">
            Retry
          </Button>
        </div>
      ) : (
        <CustomerTable
          data={data.data}
          total={data.total}
          page={state.page}
          pageSize={state.pageSize}
          sort={state.sort}
          onSortChange={(next) => setState({ sort: next, page: 1 })}
          onPageChange={(next) => setState({ page: next })}
          onPageSizeChange={(next) => setState({ pageSize: next, page: 1 })}
          onRowClick={(c) => {
            setSelected(c);
            setOpenProfile(true);
          }}
          onSelectionChange={(sel) => setBulkSelected(sel)}
          clearSelectionSignal={clearSelectionSignal}
          loading={loading}
          onSelectionCountChange={(n) => setBulkCount(n)}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        count={bulkCount || bulkSelected.length}
        onExportCSV={exportCSV}
        onAddTag={() => setShowTagModal(true)}
        onActivate={() => setConfirmAction(null)}
        onDeactivate={() => setConfirmAction(null)}
        onClear={() => {
          setBulkSelected([]);
          setBulkCount(0);
          setClearSelectionSignal((n) => n + 1);
        }}
      />

      {/* Profile Drawer */}
      <CustomerProfileDrawer open={openProfile} onClose={() => setOpenProfile(false)} customer={selected} />
    </div>
  );
}
