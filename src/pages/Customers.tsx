import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, SmartForm, FormField } from '../components';
import { useApi, apiPatch, apiPost } from '../hooks/useApi';
import { getBalance } from '../loyalty/state';
import { pointsToValue, DEFAULT_LOYALTY_CONFIG } from '../loyalty/rules';
import { validateEmail, validatePhone, validateName, ValidationResult } from '../utils/validation';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  visits: number;
  totalSpent: number;
  lastVisit: string;
}

function Customers() {
  const { data: customers, loading, error, refetch } = useApi<Customer[]>('/api/customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState<string | null>(null);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [filters, setFilters] = useState({
    minPoints: '',
    maxPoints: '',
    minVisits: '',
    maxVisits: '',
    minSpent: '',
    maxSpent: ''
  });
  
  const updatePoints = async (customerId: string, pointsToAdd: number) => {
    try {
      setUpdatingCustomer(customerId);
      const customer = customers?.find(c => c.id === customerId);
      if (customer) {
        await apiPatch(`/api/customers/${customerId}`, { 
          points: customer.points + pointsToAdd 
        });
        refetch();
      }
    } catch (error) {
      console.error('Failed to update points:', error);
    } finally {
      setUpdatingCustomer(null);
    }
  };

  // Get existing emails for validation
  const existingEmails = customers?.map(customer => customer.email.toLowerCase()) || [];

  // Enhanced add customer function
  const addCustomer = async (values: Record<string, any>) => {
    setIsAddingCustomer(true);
    try {
      await apiPost('/api/customers', values);
      setShowAddForm(false);
      refetch();
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error; // Let SmartForm handle the error display
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Customer form fields configuration with enhanced validation
  const customerFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter customer name',
      helpText: 'Customer\'s full name for account identification',
      validation: (value: string) => validateName(value)
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'customer@example.com',
      helpText: 'Email for receipts, promotions, and account recovery',
      validation: (value: string) => {
        const result = validateEmail(value);
        if (!result.isValid) return result;

        // Check for duplicate emails
        if (existingEmails.includes(value.toLowerCase())) {
          return {
            isValid: false,
            message: 'Email address already exists',
            suggestions: ['Try a different email address']
          };
        }

        return result;
      }
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: false,
      placeholder: '(555) 123-4567',
      helpText: 'Phone number for order notifications and contact (optional)',
      validation: (value: string) => {
        if (!value) return { isValid: true }; // Optional field
        return validatePhone(value);
      }
    }
  ];
  
  const clearFilters = () => {
    setFilters({
      minPoints: '',
      maxPoints: '',
      minVisits: '',
      maxVisits: '',
      minSpent: '',
      maxSpent: ''
    });
  };

  const filteredCustomers = customers?.filter(customer => {
    // Text search filter
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Advanced filters
    if (filters.minPoints && customer.points < parseInt(filters.minPoints)) return false;
    if (filters.maxPoints && customer.points > parseInt(filters.maxPoints)) return false;
    if (filters.minVisits && customer.visits < parseInt(filters.minVisits)) return false;
    if (filters.maxVisits && customer.visits > parseInt(filters.maxVisits)) return false;
    if (filters.minSpent && customer.totalSpent < parseFloat(filters.minSpent)) return false;
    if (filters.maxSpent && customer.totalSpent > parseFloat(filters.maxSpent)) return false;

    return true;
  }) || [];
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading customers: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Customer Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage customer profiles and loyalty points
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Customer</Button>
      </div>

      {/* Enhanced Add Customer Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={customerFormFields}
              onSubmit={addCustomer}
              onCancel={() => setShowAddForm(false)}
              title="Add New Customer"
              description="Create a new customer account with automatic loyalty program enrollment"
              submitLabel="Add Customer"
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey="customer-add"
              disabled={isAddingCustomer}
            />
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-4">
        <Input 
          placeholder="Search customers..." 
          className="max-w-md" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline" onClick={() => setShowFilterForm(!showFilterForm)}>
          {showFilterForm ? 'Hide Filters' : 'Filter'}
        </Button>
        {(filters.minPoints || filters.maxPoints || filters.minVisits || filters.maxVisits || filters.minSpent || filters.maxSpent) && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Advanced Filter Form */}
      {showFilterForm && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loyalty Points</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPoints}
                    onChange={(e) => setFilters({...filters, minPoints: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPoints}
                    onChange={(e) => setFilters({...filters, maxPoints: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Visits</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minVisits}
                    onChange={(e) => setFilters({...filters, minVisits: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxVisits}
                    onChange={(e) => setFilters({...filters, maxVisits: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Total Spent ($)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Min"
                    value={filters.minSpent}
                    onChange={(e) => setFilters({...filters, minSpent: e.target.value})}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Max"
                    value={filters.maxSpent}
                    onChange={(e) => setFilters({...filters, maxSpent: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredCustomers.length} of {customers?.length || 0} customers
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <Card key={customer.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{customer.name}</span>
                <div className="text-right">
                  <div className="text-sm font-normal text-blue-600 dark:text-blue-400">
                    {getBalance(customer.id) || customer.points} pts
                  </div>
                  <div className="text-xs text-gray-500">
                    ≈ ${pointsToValue(getBalance(customer.id) || customer.points, DEFAULT_LOYALTY_CONFIG).toFixed(2)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📞 {customer.phone}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ✉️ {customer.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🏪 {customer.visits} visits • ${customer.totalSpent.toFixed(2)} spent
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📅 Last visit: {formatDate(customer.lastVisit)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="flex gap-1 flex-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => updatePoints(customer.id, 10)}
                    disabled={updatingCustomer === customer.id}
                    className="flex-1"
                  >
                    {updatingCustomer === customer.id ? '...' : '+10'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => updatePoints(customer.id, 25)}
                    disabled={updatingCustomer === customer.id}
                    className="flex-1"
                  >
                    {updatingCustomer === customer.id ? '...' : '+25'}
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  className="flex-1"
                  disabled={updatingCustomer === customer.id}
                >
                  Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Customers;