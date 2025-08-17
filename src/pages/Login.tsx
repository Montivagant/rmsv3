import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components';
import { Role, setCurrentUser } from '../rbac/roles';

const roleOptions = [
  { value: Role.STAFF, label: 'Staff' },
  { value: Role.ADMIN, label: 'Admin' },
  { value: Role.TECH_ADMIN, label: 'Technical Admin' },
];

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    role: Role;
  }>({
    username: '',
    password: '',
    role: Role.STAFF,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication - in real app, this would validate credentials
    const mockUser = {
      id: '1',
      name: formData.username || 'Demo User',
      role: formData.role,
    };
    
    setCurrentUser(mockUser);
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            RMS v3
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Restaurant Management System
          </p>
        </div>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required
              />
              
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                required
              />
              
              <Select
                label="Role"
                options={roleOptions}
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
              />
              
              <Button type="submit" className="w-full" size="lg">
                Sign In
              </Button>
            </form>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 Demo Mode: Use any username/password to login with selected role
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;