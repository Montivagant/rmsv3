/**
 * User Management Page
 * 
 * Comprehensive user account management with role assignment
 */

import { useState, useMemo, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { userService } from '../../services/user';
import { branchService } from '../../services/branch';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { DataTable } from '../../components/inventory/DataTable';
import { SkeletonCard } from '../../components/feedback/LoadingSpinner';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import { Checkbox } from '../../components/Checkbox';
import type { User, UserFormData } from '../../types/user';
import type { Branch } from '../../types/branch';
import type { DynamicRole } from '../../rbac/permissions';
import { 
  FaUser, FaEnvelope, FaPhone, FaEdit, FaTrash, FaKey, 
  FaUserShield, FaBuilding, FaClock, FaSignInAlt 
} from 'react-icons/fa';
import { formatDate } from '../../lib/format';
import { validateEmail, validatePhone, validateName } from '../../utils/validation';

export default function Users() {
  const { data: users = [], loading, error, refetch } = useApi<User[]>('/api/manage/users', []);
  const { data: roles = [] } = useApi<DynamicRole[]>('/api/manage/roles', []);
  const { data: branches = [] } = useApi<Branch[]>('/api/manage/branches', []);
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Shift eligibility persistence (localStorage-backed)
  type ShiftEligibleMap = Record<string, boolean>;
  const SHIFT_ELIGIBLE_KEY = 'rms_shift_eligible_map';
  const [shiftEligible, setShiftEligible] = useState<ShiftEligibleMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHIFT_ELIGIBLE_KEY);
      setShiftEligible(raw ? (JSON.parse(raw) as ShiftEligibleMap) : {});
    } catch {
      setShiftEligible({});
    }
  }, []);

  const updateShiftEligible = (userId: string, eligible: boolean) => {
    setShiftEligible(prev => {
      const next = { ...prev, [userId]: eligible };
      try {
        localStorage.setItem(SHIFT_ELIGIBLE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    phone: '',
    status: 'active',
    roles: [],
    branchIds: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      phone: '',
      status: 'active',
      roles: [],
      branchIds: [],
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.message || 'Invalid name';
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || 'Invalid email';
    }

    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.message || 'Invalid phone';
      }
    }

    if (!formData.roles.length) {
      errors.roles = 'At least one role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const loadingId = showLoading('Creating user...');
    
    try {
      await userService.create(formData);
      showSuccess('User created successfully');
      setShowCreateModal(false);
      resetForm();
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      removeNotification(loadingId);
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser || !validateForm()) return;
    
    setIsSubmitting(true);
    const loadingId = showLoading('Updating user...');
    
    try {
      await userService.update(editingUser.id, formData);
      showSuccess('User updated successfully');
      setEditingUser(null);
      resetForm();
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      removeNotification(loadingId);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    const loadingId = showLoading('Deleting user...');
    
    try {
      await userService.delete(deletingUser.id);
      showSuccess('User deleted successfully');
      setDeletingUser(null);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      removeNotification(loadingId);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    const loadingId = showLoading('Resetting password...');
    
    try {
      const result = await userService.resetPassword(resetPasswordUser.id);
      showSuccess(`Password reset. Temporary password: ${result.temporaryPassword}`);
      setResetPasswordUser(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      removeNotification(loadingId);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const loadingId = showLoading(`${newStatus === 'active' ? 'Activating' : 'Deactivating'} user...`);
    
    try {
      await userService.toggleStatus(user.id, newStatus);
      showSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      removeNotification(loadingId);
    }
  };

  const openEditModal = (user: User) => {
    setFormData({
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      status: user.status,
      roles: user.roles,
      branchIds: user.branchIds || [],
    });
    setEditingUser(user);
    setFormErrors({});
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      
      const matchesRole = filterRole === 'all' || user.roles.includes(filterRole);
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, filterStatus, filterRole]);

  // Table columns
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <FaUser className="text-text-tertiary" />
          <span className="font-medium">{user.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'shiftEligible',
      header: 'Shift Eligible',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`shift-eligible-${user.id}`}
            checked={!!shiftEligible[user.id]}
            onChange={(e) => updateShiftEligible(user.id, e.target.checked)}
            aria-label={`Toggle shift eligibility for ${user.name}`}
          />
          <label htmlFor={`shift-eligible-${user.id}`} className="text-sm cursor-pointer">
            {shiftEligible[user.id] ? 'Eligible' : 'Not eligible'}
          </label>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      accessor: (user: User) => (
        <div className="flex items-center gap-2">
          <FaEnvelope className="text-text-tertiary" />
          <span className="text-sm text-text-secondary">{user.email}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'roles',
      header: 'Roles',
      accessor: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map(roleId => {
            const role = roles.find(r => r.id === roleId);
            return role ? (
              <Badge key={roleId} variant="secondary" size="sm">
                {role.name}
              </Badge>
            ) : null;
          })}
        </div>
      ),
    },
    {
      key: 'branches',
      header: 'Branches',
      accessor: (user: User) => {
        if (!user.branchIds?.length) return <span className="text-text-tertiary">All branches</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {user.branchIds.map(branchId => {
              const branch = branches.find(b => b.id === branchId);
              return branch ? (
                <Badge key={branchId} variant="secondary" size="sm">
                  {branch.name}
                </Badge>
              ) : null;
            })}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (user: User) => (
        <Badge 
          variant={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'warning'}
          size="sm"
        >
          {user.status}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      accessor: (user: User) => (
        <div className="text-sm text-text-secondary">
          {user.metadata.lastLoginAt ? (
            <div className="flex items-center gap-1">
              <FaSignInAlt className="text-text-tertiary" />
              <span>{formatDate(new Date(user.metadata.lastLoginAt).getTime())}</span>
            </div>
          ) : (
            <span className="text-text-tertiary">Never</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (user: User) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEditModal(user)}
            title="Edit user"
          >
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setResetPasswordUser(user)}
            title="Reset password"
          >
            <FaKey />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeletingUser(user)}
            className="text-error-600 hover:text-error-700"
            title="Delete user"
          >
            <FaTrash />
          </Button>
        </div>
      ),
    },
  ], [roles, branches]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary">Manage Users</h1>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent>
            <p className="text-error-600">Failed to load users: {error}</p>
            <Button onClick={refetch} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Manage Users</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<span className="text-text-tertiary">🔍</span>}
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyExtractor={(user) => user.id}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!editingUser}
        onClose={() => {
          setShowCreateModal(false);
          setEditingUser(null);
          resetForm();
        }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={formErrors.name}
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            error={formErrors.email}
            required
            disabled={!!editingUser} // Can't change email for existing users
          />
          
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            error={formErrors.phone}
            placeholder="Optional"
          />
          
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as User['status'] }))}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Roles <span className="text-error-600">*</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {roles.map(role => (
                <div key={role.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={formData.roles.includes(role.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setFormData(prev => ({ ...prev, roles: [...prev.roles, role.id] }));
                      } else {
                        setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role.id) }));
                      }
                    }}
                  />
                  <label 
                    htmlFor={`role-${role.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    <div className="font-medium">{role.name}</div>
                    {role.description && (
                      <div className="text-text-secondary text-xs">{role.description}</div>
                    )}
                  </label>
                </div>
              ))}
            </div>
            {formErrors.roles && (
              <p className="text-error-600 text-sm mt-1">{formErrors.roles}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Branch Access
            </label>
            <p className="text-xs text-text-secondary mb-2">
              Leave empty for access to all branches
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {branches.filter(b => b.isActive).map(branch => (
                <div key={branch.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`branch-${branch.id}`}
                    checked={formData.branchIds?.includes(branch.id) || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setFormData(prev => ({ 
                          ...prev, 
                          branchIds: [...(prev.branchIds || []), branch.id] 
                        }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          branchIds: prev.branchIds?.filter(b => b !== branch.id) || [] 
                        }));
                      }
                    }}
                  />
                  <label 
                    htmlFor={`branch-${branch.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {branch.name} {branch.isMain && <Badge variant="secondary" size="sm">Main</Badge>}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {!editingUser && (
            <div className="p-3 bg-warning-50 text-warning-800 rounded-md text-sm">
              A temporary password will be generated and displayed after user creation.
            </div>
          )}
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                setEditingUser(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingUser ? handleUpdate : handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{deletingUser?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeletingUser(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-error-600 hover:bg-error-700"
              onClick={handleDelete}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        title="Reset Password"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Reset password for <strong>{resetPasswordUser?.name}</strong>?
            A new temporary password will be generated.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setResetPasswordUser(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}