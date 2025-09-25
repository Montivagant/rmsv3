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

const BUSINESS_STORAGE_KEY = 'rmsv3-business-details';

const DEFAULT_BUSINESS_DETAILS: BusinessDetails = {

  businessName: 'Demo Restaurant',

  taxRegistrationName: '',

  taxNumber: '',

  country: 'Egypt',

  currency: 'EGP',

};



function loadLocalBusinessDetails(): BusinessDetails {

  if (typeof window === 'undefined') {

    return { ...DEFAULT_BUSINESS_DETAILS };

  }



  try {

    const stored = window.localStorage.getItem(BUSINESS_STORAGE_KEY);

    if (stored) {

      const parsed = JSON.parse(stored) as Partial<BusinessDetails>;

      return {

        ...DEFAULT_BUSINESS_DETAILS,

        ...parsed,

        country: parsed.country || DEFAULT_BUSINESS_DETAILS.country,

        currency: parsed.currency || DEFAULT_BUSINESS_DETAILS.currency

      };

    }

  } catch (error) {

    console.warn('Failed to load local business details:', error);

  }



  return { ...DEFAULT_BUSINESS_DETAILS };

}



function persistLocalBusinessDetails(details: BusinessDetails) {

  if (typeof window === 'undefined') return;



  try {

    window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(details));

  } catch (error) {

    console.warn('Failed to persist business details locally:', error);

  }

}





const PROFILE_STORAGE_KEY = 'rmsv3-account-profile';

const DEFAULT_PROFILE: Profile = {

  name: 'Business Owner',

  phone: '+201234567890',

  email: 'owner@rmsv3.local',

  language: 'en'

};



function loadLocalProfile(): Profile {

  if (typeof window === 'undefined') {

    return { ...DEFAULT_PROFILE };

  }



  try {

    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);

    if (stored) {

      const parsed = JSON.parse(stored) as Partial<Profile>;

      return {

        ...DEFAULT_PROFILE,

        ...parsed,

        language: (parsed.language as Profile['language']) || DEFAULT_PROFILE.language

      };

    }

  } catch (error) {

    console.warn('Failed to load local profile details:', error);

  }



  return { ...DEFAULT_PROFILE };

}



function persistLocalProfile(profile: Profile) {

  if (typeof window === 'undefined') return;



  try {

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));

  } catch (error) {

    console.warn('Failed to persist profile details locally:', error);

  }

}



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

  } catch (e: unknown) {

    const error = e as { status?: number; message?: string };

    const status = typeof error.status === 'number' ? error.status : 500;

    const message = error.message || 'An error occurred';

    throw new AccountApiError(status, message);

  }

}



// Profile Management

export const profileApi = {

  async get(): Promise<Profile> {

    try {

      const response = await apiRequest<AccountResponse<Profile>>('/profile');

      persistLocalProfile(response.data);

      return response.data;

    } catch (error) {

      console.warn('Using local fallback for profile details due to API error:', error);

      const fallback = loadLocalProfile();

      persistLocalProfile(fallback);

      return fallback;

    }

  },



  async update(profile: Partial<Profile>): Promise<Profile> {

    try {

      const response = await apiRequest<AccountResponse<Profile>>('/profile', {

        method: 'PUT',

        body: JSON.stringify(profile),

      });

      persistLocalProfile(response.data);

      return response.data;

    } catch (error) {

      console.warn('Applying local update for profile details due to API error:', error);

      const current = loadLocalProfile();

      const updated: Profile = {

        ...current,

        ...profile,

        name: profile.name?.trim() || current.name,

        phone: profile.phone?.trim() || current.phone,

        email: profile.email?.trim() || current.email,

        language: profile.language || current.language

      };

      persistLocalProfile(updated);

      return updated;

    }

  },



  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {

    const formData = new FormData();

    formData.append('avatar', file);



    const url = `${apiBase || ''}${API_BASE}/profile/avatar`;

    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {

      throw new AccountApiError(response.status, 'Failed to upload avatar');

    }

    const result = await response.json() as { avatarUrl: string };

    const current = loadLocalProfile();

    persistLocalProfile({ ...current, avatar: result.avatarUrl });

    return result;

  },



  async removeAvatar(): Promise<void> {

    try {

      await deleteJSON<void>(`${API_BASE}/profile/avatar`);

    } catch (error) {

      console.warn('API avatar removal failed, clearing local avatar fallback:', error);

    } finally {

      const current = loadLocalProfile();

      if (current.avatar) {

        const { avatar: _removed, ...rest } = current;

        persistLocalProfile(rest as Profile);

      }

    }

  }

};



// Business Details Management  

export const businessApi = {

  async get(): Promise<BusinessDetails> {

    try {

      const response = await apiRequest<AccountResponse<BusinessDetails>>('/business');

      persistLocalBusinessDetails(response.data);

      return response.data;

    } catch (error) {

      console.warn('Using local fallback for business details due to API error:', error);

      const fallback = loadLocalBusinessDetails();

      persistLocalBusinessDetails(fallback);

      return fallback;

    }

  },



  async update(business: Partial<BusinessDetails>): Promise<BusinessDetails> {

    try {

      const response = await putJSON<AccountResponse<BusinessDetails>>(`${API_BASE}/business`, business);

      persistLocalBusinessDetails(response.data);

      return response.data;

    } catch (error) {

      console.warn('Applying local update for business details due to API error:', error);

      const current = loadLocalBusinessDetails();

      const updated: BusinessDetails = {

        ...DEFAULT_BUSINESS_DETAILS,

        ...current,

        ...business,

        businessName: business.businessName?.trim() || current.businessName || DEFAULT_BUSINESS_DETAILS.businessName,

        taxRegistrationName: (business.taxRegistrationName ?? current.taxRegistrationName ?? DEFAULT_BUSINESS_DETAILS.taxRegistrationName) || '',



        taxNumber: (business.taxNumber ?? current.taxNumber ?? DEFAULT_BUSINESS_DETAILS.taxNumber) || '',

        country: business.country || current.country || DEFAULT_BUSINESS_DETAILS.country,

        currency: business.currency || current.currency || DEFAULT_BUSINESS_DETAILS.currency

      };

      persistLocalBusinessDetails(updated);

      return updated;

    }

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

    } catch {

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

      const userPrefs: Record<string, unknown> = {};

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

    } catch {

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

