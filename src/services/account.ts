// Account Management API Service
import {
  type Profile, 
  type BusinessDetails, 
  type Preferences, 
  type Notifications,
  type ChangePasswordRequest,
  type GeneratePinResponse,
  type AccountResponse 
} from '../types/account';
import { getCurrentUser } from '../rbac/roles';
import { userService } from './user';
import { fetchJSON, postJSON, putJSON, deleteJSON, apiBase } from '../api/client';

// Base API configuration
const API_BASE = '/api/account';

class AccountApiError extends Error {
  public status: number;
  public code?: string;
  
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'AccountApiError';
    this.status = status;
    if (code) {
      this.code = code;
    }
  }
}

// HTTP client wrapper with error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    return await fetchJSON<T>(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500;
    const message = e?.message || 'An error occurred';
    throw new AccountApiError(status, message);
  }
}

// Profile Management
export const profileApi = {
  async get(): Promise<Profile> {
    const response = await apiRequest<AccountResponse<Profile>>('/profile');
    return response.data;
  },

  async update(profile: Partial<Profile>): Promise<Profile> {
    const response = await apiRequest<AccountResponse<Profile>>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    return response.data;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const url = `${apiBase || ''}${API_BASE}/profile/avatar`;
    const response = await fetch(url, { method: 'POST', body: formData });
    if (!response.ok) {
      throw new AccountApiError(response.status, 'Failed to upload avatar');
    }
    return response.json() as Promise<{ avatarUrl: string }>;
  },

  async removeAvatar(): Promise<void> {
    await deleteJSON<void>(`${API_BASE}/profile/avatar`);
  }
};

// Business Details Management  
export const businessApi = {
  async get(): Promise<BusinessDetails> {
    const response = await apiRequest<AccountResponse<BusinessDetails>>('/business');
    return response.data;
  },

  async update(business: Partial<BusinessDetails>): Promise<BusinessDetails> {
    const response = await putJSON<AccountResponse<BusinessDetails>>(`${API_BASE}/business`, business);
    return response.data;
  }
};

// Preferences Management - Integrated with User Service
export const preferencesApi = {
  async get(): Promise<Preferences> {
    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      throw new AccountApiError(401, 'User not authenticated');
    }
    
    try {
      const user = await userService.getById(currentUser.id);
      // Map user preferences to account preferences format
      return {
        timeZone: user.preferences.timeZone || 'UTC',
        locale: user.preferences.locale || 'en',
        defaultBranchId: user.preferences.defaultBranch || '',
        taxInclusivePricing: user.preferences.taxInclusivePricing ?? true,
        enableLocalization: user.preferences.enableLocalization ?? false,
        enableTwoFactor: user.preferences.enableTwoFactor ?? false
      };
    } catch (error) {
      throw new AccountApiError(500, 'Failed to fetch preferences');
    }
  },

  async update(preferences: Partial<Preferences>): Promise<Preferences> {
    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      throw new AccountApiError(401, 'User not authenticated');
    }
    
    try {
      // Map account preferences to user preferences format
      const userPrefs: any = {};
      if (preferences.defaultBranchId !== undefined) {
        userPrefs.defaultBranch = preferences.defaultBranchId;
      }
      if (preferences.locale !== undefined) {
        userPrefs.locale = preferences.locale;
      }
      if (preferences.timeZone !== undefined) {
        userPrefs.timeZone = preferences.timeZone;
      }
      // Add other preference mappings as needed
      if (preferences.taxInclusivePricing !== undefined) {
        userPrefs.taxInclusivePricing = preferences.taxInclusivePricing;
      }
      if (preferences.enableLocalization !== undefined) {
        userPrefs.enableLocalization = preferences.enableLocalization;
      }
      if (preferences.enableTwoFactor !== undefined) {
        userPrefs.enableTwoFactor = preferences.enableTwoFactor;
      }
      
      const updatedUser = await userService.updatePreferences(currentUser.id, userPrefs);
      
      // Map back to account preferences format
      return {
        timeZone: updatedUser.preferences.timeZone || 'UTC',
        locale: updatedUser.preferences.locale || 'en',
        defaultBranchId: updatedUser.preferences.defaultBranch || '',
        taxInclusivePricing: updatedUser.preferences.taxInclusivePricing ?? true,
        enableLocalization: updatedUser.preferences.enableLocalization ?? false,
        enableTwoFactor: updatedUser.preferences.enableTwoFactor ?? false
      };
    } catch (error) {
      throw new AccountApiError(500, 'Failed to update preferences');
    }
  }
};

// Notifications Management
export const notificationsApi = {
  async get(): Promise<Notifications> {
    const response = await apiRequest<AccountResponse<Notifications>>('/notifications');
    return response.data;
  },

  async update(notifications: Partial<Notifications>): Promise<Notifications> {
    const response = await putJSON<AccountResponse<Notifications>>(`${API_BASE}/notifications`, notifications);
    return response.data;
  },

  async updateAll(enabled: boolean): Promise<Notifications> {
    const response = await postJSON<AccountResponse<Notifications>>(`${API_BASE}/notifications/toggle-all`, { enabled });
    return response.data;
  }
};

// Security Management
export const securityApi = {
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await postJSON(`${API_BASE}/security/change-password`, request);
  },

  async generatePin(): Promise<GeneratePinResponse> {
    return postJSON<GeneratePinResponse>(`${API_BASE}/security/generate-pin`, {});
  },

  async enable2FA(token: string): Promise<{ backupCodes: string[] }> {
    return postJSON<{ backupCodes: string[] }>(`${API_BASE}/security/2fa/enable`, { token });
  },

  async disable2FA(password: string): Promise<void> {
    await postJSON(`${API_BASE}/security/2fa/disable`, { password });
  },

  async get2FAQRCode(): Promise<{ qrCode: string; secret: string }> {
    return fetchJSON<{ qrCode: string; secret: string }>(`${API_BASE}/security/2fa/qr-code`);
  }
};

// Mock implementation for development/testing
// Remove these when real API endpoints are available
export const mockAccountApi = {
  profile: {
    async get(): Promise<Profile> {
      await new Promise(resolve => setTimeout(resolve, 500));
      const currentUser = getCurrentUser();
      return {
        name: currentUser?.name || 'Current User',
        phone: '1234567890', // Local digits only
        email: currentUser?.id ? `${currentUser.id}@example.com` : 'user@example.com',
        loginPin: '1234',
        language: 'en'
      };
    },

    async update(profile: Partial<Profile>): Promise<Profile> {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Simulate validation error
      if (profile.name && profile.name.length < 2) {
        throw new AccountApiError(400, 'Name must be at least 2 characters');
      }
      const currentUser = getCurrentUser();
      return {
        name: currentUser?.name || 'Current User',
        phone: '1234567890',
        email: currentUser?.id ? `${currentUser.id}@example.com` : 'user@example.com',
        loginPin: '1234',
        language: 'en',
        ...profile
      };
    }
  },

  business: {
    async get(): Promise<BusinessDetails> {
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        businessName: 'DashUp Restaurant',
        taxRegistrationName: 'DashUp Restaurant LLC',
        taxNumber: '123-456-789',
        country: 'Egypt',
        currency: 'EGP'
      };
    },

    async update(business: Partial<BusinessDetails>): Promise<BusinessDetails> {
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        businessName: 'DashUp Restaurant',
        taxRegistrationName: 'DashUp Restaurant LLC',
        taxNumber: '123-456-789',
        country: 'Egypt',
        currency: 'EGP',
        ...business
      };
    }
  },

  preferences: {
    async get(): Promise<Preferences> {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        timeZone: 'Africa/Cairo',
        taxInclusivePricing: true,
        enableLocalization: false,
        defaultBranchId: 'main-restaurant',
        locale: 'en',
        enableTwoFactor: false
      };
    },

    async update(preferences: Partial<Preferences>): Promise<Preferences> {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        timeZone: 'Africa/Cairo',
        taxInclusivePricing: true,
        enableLocalization: false,
        defaultBranchId: 'main-restaurant',
        locale: 'en',
        enableTwoFactor: false,
        ...preferences
      };
    }
  },

  notifications: {
    async get(): Promise<Notifications> {
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        costAdjustmentSubmitted: true,
        inventoryAuditSubmitted: true,
        purchasingSubmitted: false,
        quantityAdjustmentSubmitted: true,
        incomingTransfer: true,
        outgoingTransfer: true,
        productionSubmitted: false,
        inventoryNotAvailable: true,
        purchaseOrderApproval: true,
        maxQuantityReached: false,
        minQuantityReached: true,
        transferUnderReview: false,
        transferWaitingReceive: true
      };
    },

    async update(notifications: Partial<Notifications>): Promise<Notifications> {
      await new Promise(resolve => setTimeout(resolve, 600));
      // Return updated notifications (in real app, this would merge with existing)
      return {
        costAdjustmentSubmitted: true,
        inventoryAuditSubmitted: true,
        purchasingSubmitted: false,
        quantityAdjustmentSubmitted: true,
        incomingTransfer: true,
        outgoingTransfer: true,
        productionSubmitted: false,
        inventoryNotAvailable: true,
        purchaseOrderApproval: true,
        maxQuantityReached: false,
        minQuantityReached: true,
        transferUnderReview: false,
        transferWaitingReceive: true,
        ...notifications
      };
    }
  },

  security: {
    async changePassword(request: ChangePasswordRequest): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (request.currentPassword !== 'currentpass') {
        throw new AccountApiError(400, 'Current password is incorrect');
      }
      if (request.newPassword.length < 8) {
        throw new AccountApiError(400, 'New password must be at least 8 characters');
      }
      if (request.newPassword !== request.confirmPassword) {
        throw new AccountApiError(400, 'Password confirmation does not match');
      }
    },

    async generatePin(): Promise<GeneratePinResponse> {
      await new Promise(resolve => setTimeout(resolve, 300));
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      return { pin };
    }
  }
};

// Always use real API service by default; mocks remain available for tests
export const accountService = {
  profile: profileApi,
  business: businessApi,
  preferences: preferencesApi,
  notifications: notificationsApi,
  security: securityApi
};
