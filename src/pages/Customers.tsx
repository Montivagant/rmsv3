import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components';
import { useApi, apiPatch } from '../hooks/useApi';
import { getBalance } from '../loyalty/state';
import { pointsToValue, DEFAULT_LOYALTY_CONFIG } from '../loyalty/rules';

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
  const [updatingCustomer, setUpdatingCustomer] = useState<string | null>(null);
  
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
  
  const filteredCustomers = customers?.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
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
        <Button>Add Customer</Button>
      </div>
      
      <div className="flex gap-4">
        <Input 
          placeholder="Search customers..." 
          className="max-w-md" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline">Filter</Button>
      </div>
      
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