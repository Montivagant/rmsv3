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

// Base API configuration
const API_BASE = '/api/account';

class AccountApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'AccountApiError';
  }
}

// HTTP client wrapper with error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AccountApiError(
      response.status,
      errorData.message || 'An error occurred',
      errorData.code
    );
  }

  return response.json();
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

    const response = await fetch(`${API_BASE}/profile/avatar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new AccountApiError(response.status, 'Failed to upload avatar');
    }

    return response.json();
  },

  async removeAvatar(): Promise<void> {
    await apiRequest('/profile/avatar', { method: 'DELETE' });
  }
};

// Business Details Management  
export const businessApi = {
  async get(): Promise<BusinessDetails> {
    const response = await apiRequest<AccountResponse<BusinessDetails>>('/business');
    return response.data;
  },

  async update(business: Partial<BusinessDetails>): Promise<BusinessDetails> {
    const response = await apiRequest<AccountResponse<BusinessDetails>>('/business', {
      method: 'PUT',
      body: JSON.stringify(business),
    });
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
        restrictPurchasedItemsToSupplier: updatedUser.preferences.restrictPurchasedItemsToSupplier ?? false,
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
    const response = await apiRequest<AccountResponse<Notifications>>('/notifications', {
      method: 'PUT',
      body: JSON.stringify(notifications),
    });
    return response.data;
  },

  async updateAll(enabled: boolean): Promise<Notifications> {
    const response = await apiRequest<AccountResponse<Notifications>>('/notifications/toggle-all', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
    return response.data;
  }
};

// Security Management
export const securityApi = {
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await apiRequest('/security/change-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async generatePin(): Promise<GeneratePinResponse> {
    const response = await apiRequest<GeneratePinResponse>('/security/generate-pin', {
      method: 'POST',
    });
    return response;
  },

  async enable2FA(token: string): Promise<{ backupCodes: string[] }> {
    const response = await apiRequest<{ backupCodes: string[] }>('/security/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return response;
  },

  async disable2FA(password: string): Promise<void> {
    await apiRequest('/security/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async get2FAQRCode(): Promise<{ qrCode: string; secret: string }> {
    const response = await apiRequest<{ qrCode: string; secret: string }>('/security/2fa/qr-code');
    return response;
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
        language: 'en',
        avatar: undefined
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
        restrictPurchasedItemsToSupplier: false,
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
        restrictPurchasedItemsToSupplier: false,
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
        inventoryCountSubmitted: true,
        purchasingSubmitted: false,
        quantityAdjustmentSubmitted: true,
        supplierReturn: false,
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
        inventoryCountSubmitted: true,
        purchasingSubmitted: false,
        quantityAdjustmentSubmitted: true,
        supplierReturn: false,
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

// Export the appropriate API based on environment
// In development, use mock API; in production, use real API
const isDevelopment = process.env.NODE_ENV === 'development';

export const accountService = isDevelopment ? mockAccountApi : {
  profile: profileApi,
  business: businessApi,
  preferences: preferencesApi,
  notifications: notificationsApi,
  security: securityApi
};
