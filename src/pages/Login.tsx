import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components';
import { Role, setCurrentUser } from '../rbac/roles';

const roleOptions = [
  { value: Role.BUSINESS_OWNER, label: 'Business Owner' },
];

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    pin: string;
    role: Role;
  }>({
    username: '',
    password: '',
    pin: '',
    role: Role.BUSINESS_OWNER,
  });
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Basic PIN validation (4-6 digits)
    const pinOk = /^[0-9]{4,6}$/.test((formData.pin || '').trim());
    if (!pinOk) {
      setError('Please enter a valid 4-6 digit PIN');
      return;
    }
    
    // Mock authentication - in real app, this would validate credentials
    const mockUser = {
      id: '1',
      name: formData.username || 'Demo User',
      role: formData.role,
    };
    
    try {
      localStorage.setItem('rms_user_pin', formData.pin.trim());
    } catch {}

    setCurrentUser(mockUser);
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">
            DashUp
          </h1>
          <p className="mt-2 text-secondary">
            Restaurant Management System
          </p>
        </div>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle as="h2" className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
              
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />

              <Input
                label="PIN"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                placeholder="4-6 digit PIN"
                required
                helpText="Use your 4-6 digit PIN to authenticate"
              />
              
              <Select
                label="Role"
                options={roleOptions}
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
              />
              
              {error && (
                <div role="alert" className="text-error text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Sign In
              </Button>
            </form>
            
            <div className="mt-4 p-3 bg-surface-secondary rounded-md border border-secondary">
              <p className="text-sm text-tertiary">
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