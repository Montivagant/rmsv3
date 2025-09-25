import { http, HttpResponse } from 'msw'
import type {
  Profile,
  BusinessDetails,
  Preferences,
  Notifications,
  ChangePasswordRequest
} from '../types/account'

type AccountResponse<T> = {
  success: boolean
  data: T
  message?: string
}

const defaultProfile: Profile = {
  name: 'Business Owner',
  phone: '+201234567890',
  email: 'owner@rmsv3.local',
  language: 'en'
}

const defaultBusiness: BusinessDetails = {
  businessName: 'DashUp Restaurant',
  taxRegistrationName: 'DashUp Restaurant LLC',
  taxNumber: '123-456-789',
  country: 'Egypt',
  currency: 'EGP'
}

const defaultPreferences: Preferences = {
  timeZone: 'Africa/Cairo',
  taxInclusivePricing: true,
  enableLocalization: false,
  defaultBranchId: 'main-restaurant',
  locale: 'en',
  enableTwoFactor: false
}

const defaultNotifications: Notifications = {
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
}

let profileState: Profile = { ...defaultProfile }
let businessState: BusinessDetails = { ...defaultBusiness }
let preferencesState: Preferences = { ...defaultPreferences }
let notificationsState: Notifications = { ...defaultNotifications }
let currentPassword = 'currentpass'
let isTwoFactorEnabled = false
let backupCodes: string[] = []

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function jsonResponse<T>(data: T, init?: ResponseInit): HttpResponse<AccountResponse<T>> {
  return HttpResponse.json({ success: true, data }, init)
}

function sanitizeProfile(input: Partial<Profile>): Profile {
  const next: Profile = {
    ...profileState,
    ...input,
    name: input.name?.trim() || profileState.name,
    phone: input.phone?.trim() || profileState.phone,
    email: input.email?.trim() || profileState.email,
    language: input.language || profileState.language
  }

  if (input.avatar !== undefined) {
    if (input.avatar === null) {
      const { avatar: _removed, ...rest } = next as Profile & { avatar?: string }
      return rest
    }
    return { ...next, avatar: input.avatar }
  }

  if ('avatar' in profileState && profileState.avatar !== undefined) {
    return { ...next, avatar: profileState.avatar }
  }

  return next
}

function sanitizeBusiness(input: Partial<BusinessDetails>): BusinessDetails {
  const businessName = input.businessName?.trim() || businessState.businessName
  const taxRegistrationName = input.taxRegistrationName ?? businessState.taxRegistrationName ?? ''
  const taxNumber = input.taxNumber ?? businessState.taxNumber ?? ''
  const country = input.country || businessState.country
  const currency = input.currency || businessState.currency

  return {
    businessName,
    taxRegistrationName,
    taxNumber,
    country,
    currency
  }
}

function sanitizePreferences(input: Partial<Preferences>): Preferences {
  const timeZone = input.timeZone || preferencesState.timeZone
  const locale = input.locale ?? preferencesState.locale
  const defaultBranchId = input.defaultBranchId ?? preferencesState.defaultBranchId ?? ''
  const taxInclusivePricing = input.taxInclusivePricing ?? preferencesState.taxInclusivePricing
  const enableLocalization = input.enableLocalization ?? preferencesState.enableLocalization
  const enableTwoFactor = input.enableTwoFactor ?? preferencesState.enableTwoFactor

  const next: Preferences = {
    timeZone,
    defaultBranchId,
    taxInclusivePricing,
    enableLocalization,
    enableTwoFactor
  }

  if (locale !== undefined) {
    next.locale = locale
  }

  return next
}

export const accountHandlers = [
  http.get('/api/account/profile', () => {
    return jsonResponse(clone(profileState))
  }),

  http.put('/api/account/profile', async ({ request }) => {
    const updates = await request.json().catch(() => ({})) as Partial<Profile>
    profileState = sanitizeProfile(updates)
    return jsonResponse(clone(profileState))
  }),

  http.post('/api/account/profile/avatar', async ({ request }) => {
    await request.arrayBuffer().catch(() => undefined)
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileState.name)}`
    profileState = { ...profileState, avatar: avatarUrl }
    return HttpResponse.json({ avatarUrl })
  }),

  http.delete('/api/account/profile/avatar', () => {
    const { avatar: _removed, ...rest } = profileState as Profile & { avatar?: string }
    profileState = { ...rest }
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/account/business', () => {
    return jsonResponse(clone(businessState))
  }),

  http.put('/api/account/business', async ({ request }) => {
    const updates = await request.json().catch(() => ({})) as Partial<BusinessDetails>
    businessState = sanitizeBusiness(updates)
    return jsonResponse(clone(businessState))
  }),

  http.get('/api/account/preferences', () => {
    const response = sanitizePreferences({ enableTwoFactor: isTwoFactorEnabled })
    preferencesState = response
    return jsonResponse(clone(preferencesState))
  }),

  http.put('/api/account/preferences', async ({ request }) => {
    const updates = await request.json().catch(() => ({})) as Partial<Preferences>
    preferencesState = sanitizePreferences(updates)
    isTwoFactorEnabled = Boolean(preferencesState.enableTwoFactor)
    return jsonResponse(clone(preferencesState))
  }),

  http.get('/api/account/notifications', () => {
    return jsonResponse(clone(notificationsState))
  }),

  http.put('/api/account/notifications', async ({ request }) => {
    const updates = await request.json().catch(() => ({})) as Partial<Notifications>
    notificationsState = {
      ...notificationsState,
      ...updates
    }
    return jsonResponse(clone(notificationsState))
  }),

  http.post('/api/account/notifications/toggle-all', async ({ request }) => {
    const body = await request.json().catch(() => ({})) as { enabled?: boolean }
    const enabled = Boolean(body.enabled)
    notificationsState = Object.keys(notificationsState).reduce((acc, key) => {
      acc[key as keyof Notifications] = enabled
      return acc
    }, {} as Notifications)
    return jsonResponse(clone(notificationsState))
  }),

  http.post('/api/account/security/change-password', async ({ request }) => {
    const body = await request.json().catch(() => ({})) as ChangePasswordRequest
    if (!body.currentPassword) {
      return HttpResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    if (body.currentPassword !== currentPassword) {
      return HttpResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    if (body.newPassword !== body.confirmPassword) {
      return HttpResponse.json({ error: 'Password confirmation does not match' }, { status: 400 })
    }
    currentPassword = body.newPassword
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/account/security/generate-pin', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    return HttpResponse.json({ pin })
  }),

  http.get('/api/account/security/2fa/qr-code', () => {
    const qrCode = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPg=='
    const secret = 'MOCK-SECRET-123456'
    return HttpResponse.json({ qrCode, secret })
  }),

  http.post('/api/account/security/2fa/enable', async ({ request }) => {
    const { token } = await request.json().catch(() => ({})) as { token?: string }
    if (!token || token.length < 6) {
      return HttpResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    isTwoFactorEnabled = true
    backupCodes = Array.from({ length: 6 }, () => Math.random().toString(36).slice(2, 10).toUpperCase())
    preferencesState = { ...preferencesState, enableTwoFactor: true }
    return HttpResponse.json({ backupCodes })
  }),

  http.post('/api/account/security/2fa/disable', async ({ request }) => {
    const { password } = await request.json().catch(() => ({})) as { password?: string }
    if (!password) {
      return HttpResponse.json({ error: 'Password is required' }, { status: 400 })
    }
    if (password !== currentPassword) {
      return HttpResponse.json({ error: 'Password is incorrect' }, { status: 400 })
    }
    isTwoFactorEnabled = false
    backupCodes = []
    preferencesState = { ...preferencesState, enableTwoFactor: false }
    return HttpResponse.json({ success: true })
  })
]
