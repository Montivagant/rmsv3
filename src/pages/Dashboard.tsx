import { Card, CardHeader, CardTitle, CardContent } from '../components';

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to RMS v3 - Restaurant Management System
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              $1,234.56
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              8
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              2 in kitchen, 6 ready
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Staff Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              5
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              3 servers, 2 kitchen
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;