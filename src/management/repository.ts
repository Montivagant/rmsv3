import { bootstrapEventStore } from '../bootstrap/persist';
import { stableHash } from '../events/hash';
import { logger } from '../shared/logger';
import type { VersionedEvent } from '../events/validation';
import type { User, UserStatus, UserPreferences, UserMetadata } from '../types/user';
import type { Branch, BranchFormData } from '../types/branch';
import type { DynamicRole } from '../rbac/permissions';

// Event types for users
interface UserCreatedEvent extends VersionedEvent {
  type: 'user.created.v1';
  version: 1;
  payload: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    status: UserStatus;
    roles: string[];
    branchIds: string[];
    passwordHash?: string; // Only stored if needed for offline auth
    metadata: {
      createdBy: string;
      notes?: string;
    };
    preferences: UserPreferences;
  };
}

interface UserUpdatedEvent extends VersionedEvent {
  type: 'user.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<{
      email: string;
      name: string;
      phone: string;
      status: UserStatus;
      roles: string[];
      branchIds: string[];
      preferences: Partial<UserPreferences>;
      metadata: Partial<UserMetadata>;
    }>;
  };
}

interface UserDeletedEvent extends VersionedEvent {
  type: 'user.deleted.v1';
  version: 1;
  payload: {
    id: string;
    reason?: string;
    deletedBy: string;
  };
}

interface UserLoginEvent extends VersionedEvent {
  type: 'user.login.v1';
  version: 1;
  payload: {
    id: string;
    timestamp: number;
    ipAddress?: string;
    userAgent?: string;
  };
}

// Event types for branches
interface BranchCreatedEvent extends VersionedEvent {
  type: 'branch.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    isMain: boolean;
    type: Branch['type'];
    address: Branch['address'];
    contact?: Branch['contact'];
    storageAreas: string[];
    isActive: boolean;
    createdBy: string;
  };
}

interface BranchUpdatedEvent extends VersionedEvent {
  type: 'branch.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<{
      name: string;
      isMain: boolean;
      type: Branch['type'];
      address: Branch['address'];
      contact: Branch['contact'];
      storageAreas: string[];
      isActive: boolean;
    }>;
  };
}

interface BranchDeletedEvent extends VersionedEvent {
  type: 'branch.deleted.v1';
  version: 1;
  payload: {
    id: string;
    reason?: string;
    deletedBy: string;
  };
}

// Event types for roles
interface RoleCreatedEvent extends VersionedEvent {
  type: 'role.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    description: string;
    permissions: DynamicRole['permissions'];
    isSystem: boolean;
    createdBy: string;
  };
}

interface RoleUpdatedEvent extends VersionedEvent {
  type: 'role.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<{
      name: string;
      description: string;
      permissions: DynamicRole['permissions'];
    }>;
  };
}

interface RoleDeletedEvent extends VersionedEvent {
  type: 'role.deleted.v1';
  version: 1;
  payload: {
    id: string;
    deletedBy: string;
  };
}

// State management
interface UserState extends User {
  deleted: boolean;
}

interface BranchState extends Branch {
  deleted: boolean;
}

interface RoleState extends DynamicRole {
  deleted: boolean;
}

function ensureUserState(map: Map<string, UserState>, id: string): UserState {
  const existing = map.get(id);
  if (existing) return existing;
  
  const fallback: UserState = {
    id,
    email: `user-${id}@example.com`,
    name: `User ${id}`,
    status: 'pending',
    roles: [],
    branchIds: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      loginCount: 0
    },
    preferences: {
      defaultBranch: 'main',
      locale: 'en',
      timeZone: 'UTC'
    },
    deleted: false
  };
  map.set(id, fallback);
  return fallback;
}

function ensureBranchState(map: Map<string, BranchState>, id: string): BranchState {
  const existing = map.get(id);
  if (existing) return existing;
  
  const fallback: BranchState = {
    id,
    name: `Branch ${id}`,
    isMain: id === 'main',
    type: 'restaurant',
    address: {
      street: '',
      city: '',
      country: 'Unknown'
    },
    storageAreas: [],
    isActive: true,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    },
    deleted: false
  };
  map.set(id, fallback);
  return fallback;
}

function ensureRoleState(map: Map<string, RoleState>, id: string): RoleState {
  const existing = map.get(id);
  if (existing) return existing;
  
  const fallback: RoleState = {
    id,
    name: `Role ${id}`,
    description: `Auto-generated role ${id}`,
    permissions: [],
    isSystem: false,
    createdBy: 'system',
    createdAt: Date.now(),
    modifiedBy: 'system',
    modifiedAt: Date.now(),
    deleted: false
  };
  map.set(id, fallback);
  return fallback;
}

// Load functions
async function loadUsersMap(): Promise<Map<string, UserState>> {
  const { store } = await bootstrapEventStore();
  const events: any[] = store.getAll(); // TODO: type this properly from EventStore
  const map = new Map<string, UserState>();

  for (const event of events) {
    if (event.type === 'user.created.v1' || event.type === 'user.created') {
      const payload = (event as UserCreatedEvent).payload;
      const state: UserState = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        phone: payload.phone || '',
        status: payload.status,
        roles: payload.roles,
        branchIds: payload.branchIds,
        metadata: {
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString(),
          createdBy: payload.metadata.createdBy,
          ...(payload.metadata.notes && { notes: payload.metadata.notes }),
          loginCount: 0
        },
        preferences: payload.preferences,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'user.updated.v1' || event.type === 'user.updated') {
      const payload = (event as UserUpdatedEvent).payload;
      const record = ensureUserState(map, payload.id);
      
      if (payload.changes.email) record.email = payload.changes.email;
      if (payload.changes.name) record.name = payload.changes.name;
      if (payload.changes.phone !== undefined) record.phone = payload.changes.phone;
      if (payload.changes.status) record.status = payload.changes.status;
      if (payload.changes.roles) record.roles = payload.changes.roles;
      if (payload.changes.branchIds) record.branchIds = payload.changes.branchIds;
      if (payload.changes.preferences) {
        record.preferences = { ...record.preferences, ...payload.changes.preferences };
      }
      if (payload.changes.metadata) {
        record.metadata = { ...record.metadata, ...payload.changes.metadata };
      }
      record.metadata.updatedAt = new Date(event.at).toISOString();
      continue;
    }

    if (event.type === 'user.deleted.v1' || event.type === 'user.deleted') {
      const payload = (event as UserDeletedEvent).payload;
      const record = ensureUserState(map, payload.id);
      record.deleted = true;
      record.metadata.updatedAt = new Date(event.at).toISOString();
      continue;
    }

    if (event.type === 'user.login.v1' || event.type === 'user.login') {
      const payload = (event as UserLoginEvent).payload;
      const record = map.get(payload.id);
      if (record) {
        record.metadata.lastLoginAt = new Date(payload.timestamp).toISOString();
        record.metadata.loginCount = (record.metadata.loginCount || 0) + 1;
      }
      continue;
    }
  }

  return map;
}

async function loadBranchesMap(): Promise<Map<string, BranchState>> {
  const { store } = await bootstrapEventStore();
  const events: any[] = store.getAll(); // TODO: type this properly from EventStore
  const map = new Map<string, BranchState>();

  // Add default main branch if none exist
  const defaultBranch: BranchState = {
    id: 'main',
    name: 'Main Branch',
    isMain: true,
    type: 'restaurant',
    address: {
      street: '123 Main St',
      city: 'City',
      country: 'Country'
    },
    storageAreas: ['kitchen', 'storage', 'freezer'],
    isActive: true,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      itemCount: 0,
      employeeCount: 0
    },
    deleted: false
  };
  map.set('main', defaultBranch);

  for (const event of events) {
    if (event.type === 'branch.created.v1' || event.type === 'branch.created') {
      const payload = (event as BranchCreatedEvent).payload;
      const state: BranchState = {
        id: payload.id,
        name: payload.name,
        isMain: payload.isMain,
        type: payload.type,
        address: payload.address,
        ...(payload.contact && { contact: payload.contact }),
        storageAreas: payload.storageAreas,
        isActive: payload.isActive,
        metadata: {
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString(),
          createdBy: payload.createdBy,
          itemCount: 0,
          employeeCount: 0
        },
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'branch.updated.v1' || event.type === 'branch.updated') {
      const payload = (event as BranchUpdatedEvent).payload;
      const record = ensureBranchState(map, payload.id);
      Object.assign(record, payload.changes);
      record.metadata.updatedAt = new Date(event.at).toISOString();
      continue;
    }

    if (event.type === 'branch.deleted.v1' || event.type === 'branch.deleted') {
      const payload = (event as BranchDeletedEvent).payload;
      const record = ensureBranchState(map, payload.id);
      record.deleted = true;
      record.metadata.updatedAt = new Date(event.at).toISOString();
      continue;
    }
  }

  // Count employees per branch
  const usersMap = await loadUsersMap();
  for (const user of usersMap.values()) {
    if (!user.deleted) {
      for (const branchId of user.branchIds) {
        const branch = map.get(branchId);
        if (branch) {
          branch.metadata.employeeCount = (branch.metadata.employeeCount || 0) + 1;
        }
      }
    }
  }

  return map;
}

async function loadRolesMap(): Promise<Map<string, RoleState>> {
  const { store } = await bootstrapEventStore();
  const events: any[] = store.getAll(); // TODO: type this properly from EventStore
  const map = new Map<string, RoleState>();

  // Add default system roles
  const defaultRoles: RoleState[] = [
    {
      id: 'business-owner',
      name: 'Business Owner',
      description: 'Full system access with all permissions',
      permissions: [
        { id: 'all', name: 'All Permissions', description: 'Full system access', module: '*', action: '*' }
      ],
      isSystem: true,
    createdBy: 'system',
    createdAt: Date.now(),
    modifiedBy: 'system',
    modifiedAt: Date.now(),
      deleted: false
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Management access with reporting capabilities',
      permissions: [
        { id: 'pos-manage', name: 'POS Management', description: 'Manage POS operations', module: 'pos', action: 'manage' },
        { id: 'inventory-manage', name: 'Inventory Management', description: 'Manage inventory', module: 'inventory', action: 'manage' },
        { id: 'reports-view', name: 'View Reports', description: 'View all reports', module: 'reports', action: 'view' }
      ],
      isSystem: true,
    createdBy: 'system',
    createdAt: Date.now(),
    modifiedBy: 'system',
    modifiedAt: Date.now(),
      deleted: false
    },
    {
      id: 'staff',
      name: 'Staff',
      description: 'Basic staff access for daily operations',
      permissions: [
        { id: 'pos-operate', name: 'Operate POS', description: 'Use POS system', module: 'pos', action: 'operate' },
        { id: 'inventory-view', name: 'View Inventory', description: 'View inventory levels', module: 'inventory', action: 'view' }
      ],
      isSystem: true,
    createdBy: 'system',
    createdAt: Date.now(),
    modifiedBy: 'system',
    modifiedAt: Date.now(),
      deleted: false
    }
  ];

  for (const role of defaultRoles) {
    map.set(role.id, role);
  }

  for (const event of events) {
    if (event.type === 'role.created.v1' || event.type === 'role.created') {
      const payload = (event as RoleCreatedEvent).payload;
      const state: RoleState = {
        id: payload.id,
        name: payload.name,
        description: payload.description,
        permissions: payload.permissions,
        isSystem: payload.isSystem,
        createdBy: payload.createdBy,
        createdAt: event.at,
        modifiedBy: payload.createdBy,
        modifiedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'role.updated.v1' || event.type === 'role.updated') {
      const payload = (event as RoleUpdatedEvent).payload;
      const record = ensureRoleState(map, payload.id);
      Object.assign(record, payload.changes);
      record.modifiedAt = event.at;
      continue;
    }

    if (event.type === 'role.deleted.v1' || event.type === 'role.deleted') {
      const payload = (event as RoleDeletedEvent).payload;
      const record = ensureRoleState(map, payload.id);
      record.deleted = true;
      record.modifiedAt = event.at;
      continue;
    }
  }

  // Count role usage
  const usersMap = await loadUsersMap();
  for (const user of usersMap.values()) {
    if (!user.deleted) {
      for (const roleId of user.roles) {
        const role = map.get(roleId);
        if (role) {
          // Usage count tracking removed as it's not part of DynamicRole interface
        }
      }
    }
  }

  return map;
}

// Repository functions
export async function listUsers(): Promise<User[]> {
  const map = await loadUsersMap();
  return Array.from(map.values())
    .filter(user => !user.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUserById(id: string): Promise<User | null> {
  const map = await loadUsersMap();
  const user = map.get(id);
  return user && !user.deleted ? user : null;
}

export async function listBranches(): Promise<Branch[]> {
  const map = await loadBranchesMap();
  return Array.from(map.values())
    .filter(branch => !branch.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const map = await loadBranchesMap();
  const branch = map.get(id);
  return branch && !branch.deleted ? branch : null;
}

export async function listRoles(): Promise<DynamicRole[]> {
  const map = await loadRolesMap();
  return Array.from(map.values())
    .filter(role => !role.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRoleById(id: string): Promise<DynamicRole | null> {
  const map = await loadRolesMap();
  const role = map.get(id);
  return role && !role.deleted ? role : null;
}

// Create operations
export interface CreateUserInput {
  email: string;
  name: string;
  phone?: string;
  status?: UserStatus;
  roles: string[];
  branchIds: string[];
  passwordHash?: string;
  createdBy: string;
  notes?: string;
  preferences?: Partial<UserPreferences>;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { store } = await bootstrapEventStore();
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const defaultPreferences: UserPreferences = {
    defaultBranch: input.branchIds[0] || 'main',
    locale: 'en',
    timeZone: 'UTC',
    ...input.preferences
  };

  const result = store.append('user.created.v1', {
    id,
    email: input.email,
    name: input.name,
    ...(input.phone && { phone: input.phone }),
    status: input.status || 'active',
    roles: input.roles,
    branchIds: input.branchIds,
    ...(input.passwordHash && { passwordHash: input.passwordHash }),
    metadata: {
      createdBy: input.createdBy,
      ...(input.notes && { notes: input.notes })
    },
    preferences: defaultPreferences
  }, {
    key: `create-user-${id}`,
    params: input,
    aggregate: { id, type: 'user' }
  });

  return {
    id,
    email: input.email,
    name: input.name,
    phone: input.phone || '',
    status: input.status || 'active',
    roles: input.roles,
    branchIds: input.branchIds,
    metadata: {
      createdAt: new Date(result.event.at).toISOString(),
      updatedAt: new Date(result.event.at).toISOString(),
      createdBy: input.createdBy,
      ...(input.notes && { notes: input.notes }),
      loginCount: 0
    },
    preferences: defaultPreferences
  };
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  phone?: string;
  status?: UserStatus;
  roles?: string[];
  branchIds?: string[];
  preferences?: Partial<UserPreferences>;
  notes?: string;
  metadata?: Partial<UserMetadata>;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  const changes = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  store.append('user.updated.v1', {
    id,
    changes
  }, {
    key: `update-user-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'user' }
  });

  return {
    ...existing,
    ...changes,
    metadata: {
      ...existing.metadata,
      ...changes.metadata,
      updatedAt: new Date().toISOString()
    },
    preferences: {
      ...existing.preferences,
      ...changes.preferences
    }
  };
}

export async function deleteUser(id: string, reason?: string, deletedBy?: string): Promise<boolean> {
  const existing = await getUserById(id);
  if (!existing) return false;

  const { store } = await bootstrapEventStore();
  store.append('user.deleted.v1', {
    id,
    ...(reason && { reason }),
    deletedBy: deletedBy || 'system'
  }, {
    key: `delete-user-${id}`,
    params: { id, reason, deletedBy },
    aggregate: { id, type: 'user' }
  });

  return true;
}

export async function recordUserLogin(id: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const { store } = await bootstrapEventStore();
  
  store.append('user.login.v1', {
    id,
    timestamp: Date.now(),
    ...(ipAddress && { ipAddress }),
    ...(userAgent && { userAgent })
  }, {
    key: `user-login-${id}-${Date.now()}`,
    params: { id, ipAddress, userAgent },
    aggregate: { id, type: 'user' }
  });

  logger.info(`User login recorded`, { userId: id, ipAddress, userAgent });
}

export async function createBranch(input: BranchFormData, createdBy: string): Promise<Branch> {
  const { store } = await bootstrapEventStore();
  const id = `branch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('branch.created.v1', {
    id,
    name: input.name,
    isMain: input.isMain || false,
    type: input.type,
    address: {
      street: input.street,
      city: input.city,
      ...(input.state && { state: input.state }),
      ...(input.postalCode && { postalCode: input.postalCode }),
      country: input.country
    },
    contact: {
      ...(input.phone && { phone: input.phone }),
      ...(input.email && { email: input.email }),
      ...(input.manager && { manager: input.manager })
    },
    storageAreas: input.storageAreas,
    isActive: input.isActive !== false,
    createdBy
  }, {
    key: `create-branch-${id}`,
    params: { ...input, createdBy },
    aggregate: { id, type: 'branch' }
  });

  return {
    id,
    name: input.name,
    isMain: input.isMain || false,
    type: input.type,
    address: {
      street: input.street,
      city: input.city,
      ...(input.state && { state: input.state }),
      ...(input.postalCode && { postalCode: input.postalCode }),
      country: input.country
    },
    contact: {
      ...(input.phone && { phone: input.phone }),
      ...(input.email && { email: input.email }),
      ...(input.manager && { manager: input.manager })
    },
    storageAreas: input.storageAreas,
    isActive: input.isActive !== false,
    metadata: {
      createdAt: new Date(result.event.at).toISOString(),
      updatedAt: new Date(result.event.at).toISOString(),
      createdBy,
      itemCount: 0,
      employeeCount: 0
    }
  };
}

export async function updateBranch(id: string, input: Partial<BranchFormData>): Promise<Branch | null> {
  const existing = await getBranchById(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  const changes: Partial<BranchFormData> = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  const updatedBranch = { ...existing, ...changes };
  const eventChanges: Partial<Branch> = { ...changes };

  // Handle address changes
  if (changes.street || changes.city || changes.state || changes.postalCode || changes.country) {
    const newAddress: typeof existing.address = {
      street: changes.street || existing.address.street,
      city: changes.city || existing.address.city,
      country: changes.country || existing.address.country
    };
    if (changes.state !== undefined) {
      newAddress.state = changes.state;
    } else if (existing.address.state !== undefined) {
      newAddress.state = existing.address.state;
    }
    if (changes.postalCode !== undefined) {
      newAddress.postalCode = changes.postalCode;
    } else if (existing.address.postalCode !== undefined) {
      newAddress.postalCode = existing.address.postalCode;
    }
    updatedBranch.address = newAddress;
    eventChanges.address = newAddress;
    delete (eventChanges as Partial<BranchFormData>).street;
    delete (eventChanges as Partial<BranchFormData>).city;
    delete (eventChanges as Partial<BranchFormData>).state;
    delete (eventChanges as Partial<BranchFormData>).postalCode;
    delete (eventChanges as Partial<BranchFormData>).country;
  }

  // Handle contact changes
  if (changes.phone || changes.email || changes.manager) {
    const newContact: typeof existing.contact = {};
    if (changes.phone !== undefined) {
      newContact.phone = changes.phone;
    } else if (existing.contact?.phone !== undefined) {
      newContact.phone = existing.contact.phone;
    }
    if (changes.email !== undefined) {
      newContact.email = changes.email;
    } else if (existing.contact?.email !== undefined) {
      newContact.email = existing.contact.email;
    }
    if (changes.manager !== undefined) {
      newContact.manager = changes.manager;
    } else if (existing.contact?.manager !== undefined) {
      newContact.manager = existing.contact.manager;
    }
    updatedBranch.contact = newContact;
    eventChanges.contact = newContact;
    delete (eventChanges as Partial<BranchFormData>).phone;
    delete (eventChanges as Partial<BranchFormData>).email;
    delete (eventChanges as Partial<BranchFormData>).manager;
  }

  store.append('branch.updated.v1', {
    id,
    changes: eventChanges
  }, {
    key: `update-branch-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'branch' }
  });

  return {
    ...updatedBranch,
    metadata: {
      ...existing.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function deleteBranch(id: string, reason?: string, deletedBy?: string): Promise<boolean> {
  const existing = await getBranchById(id);
  if (!existing || existing.isMain) return false; // Cannot delete main branch

  const { store } = await bootstrapEventStore();
  store.append('branch.deleted.v1', {
    id,
    ...(reason && { reason }),
    deletedBy: deletedBy || 'system'
  }, {
    key: `delete-branch-${id}`,
    params: { id, reason, deletedBy },
    aggregate: { id, type: 'branch' }
  });

  return true;
}

export async function toggleBranchActive(id: string, isActive: boolean): Promise<Branch | null> {
  const existing = await getBranchById(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  store.append('branch.updated.v1', {
    id,
    changes: { isActive }
  }, {
    key: `toggle-branch-active-${id}-${isActive}`,
    params: { id, isActive },
    aggregate: { id, type: 'branch' }
  });

  return {
    ...existing,
    isActive,
    metadata: {
      ...existing.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function setMainBranch(id: string): Promise<Branch | null> {
  const targetBranch = await getBranchById(id);
  if (!targetBranch) return null;

  const { store } = await bootstrapEventStore();
  
  // First, unset current main branch
  const branches = await listBranches();
  const currentMain = branches.find(b => b.isMain);
  
  if (currentMain && currentMain.id !== id) {
    store.append('branch.updated.v1', {
      id: currentMain.id,
      changes: { isMain: false }
    }, {
      key: `unset-main-branch-${currentMain.id}`,
      params: { id: currentMain.id, isMain: false },
      aggregate: { id: currentMain.id, type: 'branch' }
    });
  }

  // Set new main branch
  store.append('branch.updated.v1', {
    id,
    changes: { isMain: true }
  }, {
    key: `set-main-branch-${id}`,
    params: { id, isMain: true },
    aggregate: { id, type: 'branch' }
  });

  return {
    ...targetBranch,
    isMain: true,
    metadata: {
      ...targetBranch.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function updateRole(id: string, input: { name?: string; description?: string; permissions?: DynamicRole['permissions'] }): Promise<DynamicRole | null> {
  const existing = await getRoleById(id);
  if (!existing || existing.isSystem) return null; // Cannot update system roles

  const { store } = await bootstrapEventStore();
  const changes = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  store.append('role.updated.v1', {
    id,
    changes
  }, {
    key: `update-role-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'role' }
  });

  const updatedRole = {
    ...existing,
    ...changes,
    modifiedAt: Date.now()
  };
  
  // This is a type-cast to satisfy the return type, but the object may not be a valid DynamicRole
  return updatedRole as unknown as DynamicRole;
}

export async function deleteRole(id: string, deletedBy?: string): Promise<boolean> {
  const existing = await getRoleById(id);
  if (!existing || existing.isSystem) return false; // Cannot delete system roles

  const { store } = await bootstrapEventStore();
  store.append('role.deleted.v1', {
    id,
    deletedBy: deletedBy || 'system'
  }, {
    key: `delete-role-${id}`,
    params: { id, deletedBy },
    aggregate: { id, type: 'role' }
  });

  return true;
}

export async function createRole(
  name: string,
  description: string,
  permissions: DynamicRole['permissions'],
  createdBy: string,
  isSystem = false
): Promise<DynamicRole> {
  const { store } = await bootstrapEventStore();
  const id = `role_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('role.created.v1', {
    id,
    name,
    description,
    permissions,
    isSystem,
    createdBy
  }, {
    key: `create-role-${id}`,
    params: { name, description, permissions, createdBy, isSystem },
    aggregate: { id, type: 'role' }
  });

  return {
    id,
    name,
    description,
    permissions,
    isSystem,
    createdBy,
    createdAt: result.event.at,
    modifiedBy: createdBy,
    modifiedAt: result.event.at
  };
}
