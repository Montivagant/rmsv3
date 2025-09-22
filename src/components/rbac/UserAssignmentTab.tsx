import { useState, useEffect } from 'react';
import { Button, Input, Select, Card, CardContent } from '../';
import type { DynamicRole } from '../../rbac/permissions';
import { dynamicRBACService } from '../../rbac/dynamicRBACService';
import { getCurrentUser, setCurrentUser, type User } from '../../rbac/roles';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

interface UserAssignmentTabProps {
  canManageUsers: boolean;
  rbacService: typeof dynamicRBACService;
  onUserRoleChange?: () => void;
}

// Mock users for development - in real app, this would come from API
const MOCK_USERS: MockUser[] = [
  {
    id: 'business-owner-1',
    name: 'Business Owner',
    email: 'owner@restaurant.com',
    role: 'BUSINESS_OWNER',
    status: 'active',
    lastLogin: new Date().toISOString()
  }
];

export function UserAssignmentTab({ canManageUsers, rbacService, onUserRoleChange }: UserAssignmentTabProps) {
  const [users, setUsers] = useState<MockUser[]>(MOCK_USERS);
  const [, setRoles] = useState<DynamicRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const currentUser = getCurrentUser();

  useEffect(() => {
    // Load available roles
    const availableRoles = rbacService.getAllRoles();
    setRoles(availableRoles);

    // Check if current user needs bootstrap
    if (currentUser?.role === 'BUSINESS_OWNER') {
      const userRoles = rbacService.getUserRoles(currentUser.id);
      const hasRoleManagement = rbacService.hasPermission(currentUser.id, 'settings.role_management');
      setShowBootstrap(!hasRoleManagement && userRoles.length === 0);
    }
  }, [rbacService, currentUser]);

  const handleBootstrap = async () => {
    if (!currentUser || currentUser.role !== 'BUSINESS_OWNER') return;

    try {
      // Assign business_owner role to current BUSINESS_OWNER user
      await rbacService.assignUserToRole(currentUser.id, 'business_owner');
      setShowBootstrap(false);
      onUserRoleChange?.();
    } catch (error) {
      console.error('Bootstrap failed:', error);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      // For demo purposes, we'll just update the legacy role
      const user = users.find(u => u.id === userId);
      if (user) {
        // Update mock user data
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, role: roleId } : u
        ));

        // If this is the current user, update their session
        if (userId === currentUser?.id) {
          const updatedUser: User = {
            id: currentUser.id,
            name: currentUser.name,
            role: roleId as any
          };
          setCurrentUser(updatedUser);
        }

        onUserRoleChange?.();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">Access Restricted</h3>
        <p className="text-muted-foreground">
          You don't have permission to manage user assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bootstrap Banner */}
      {showBootstrap && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-warning-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 17.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-warning-700">Bootstrap Required</h4>
                  <p className="text-sm text-warning-700">
                    Your BUSINESS_OWNER account needs role management permissions to access this system.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleBootstrap}
                className="bg-warning-600 hover:bg-warning-700 text-text-inverse"
              >
                Bootstrap Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Role Assignments</h3>
          <p className="text-muted-foreground">
            Manage user roles and permissions assignments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map(user => {
          const userRoles = rbacService.getUserRoles(user.id);
          
          return (
            <Card key={user.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' 
                          ? 'bg-success text-success'
                          : 'bg-surface-secondary text-secondary'
                      }`}>
                        {user.status}
                      </span>
                      {user.lastLogin && (
                        <span className="text-xs text-muted-foreground">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Legacy Role */}
                  <div className="text-right">
                    <label className="block text-sm font-medium mb-1">Legacy Role</label>
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      options={[
                        { value: 'BUSINESS_OWNER', label: 'Business Owner' }
                      ]}
                      className="w-40"
                    />
                  </div>

                  {/* Dynamic Roles */}
                  <div className="text-right">
                    <label className="block text-sm font-medium mb-1">Dynamic Roles</label>
                    <div className="text-sm text-muted-foreground">
                      {userRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((role: DynamicRole) => {
                            return (
                              <span key={role.id} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                {role.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No dynamic roles</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* User Management Modal would go here */}
      {selectedUser && (
        <div className="modal-backdrop z-50 flex items-center justify-center">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Manage {selectedUser.name}</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedUser(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Advanced role management features coming soon. Currently you can update 
                  the legacy role using the dropdown in the user list.
                </p>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
