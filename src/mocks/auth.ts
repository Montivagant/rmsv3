import { http, HttpResponse } from 'msw';
import CryptoJS from 'crypto-js';
import { eventStore } from '../events/store';
import { welcomeEmail } from '../email/templates';
import { stableHash } from '../events/hash';

type BusinessType =
  | 'Quick Service'
  | 'Fine Dining'
  | 'Coffee Shop'
  | 'Pizzeria'
  | 'Bakery'
  | 'Caterer'
  | 'Food Truck'
  | 'Grocery'
  | 'Retail'
  | 'Other';

const BUSINESS_TYPES: BusinessType[] = [
  'Quick Service',
  'Fine Dining',
  'Coffee Shop',
  'Pizzeria',
  'Bakery',
  'Caterer',
  'Food Truck',
  'Grocery',
  'Retail',
  'Other',
];

interface SignupBody {
  name: string;
  email: string;
  password: string;
  phoneE164: string; // must start with +20
  businessName: string;
  businessType: BusinessType;
  termsAccepted: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phoneE164: string;
  passwordHash: string;
  createdAt: string;
  termsAcceptedAt: string;
}

interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  country: 'EG';
  createdAt: string;
}

interface QueuedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  userId: string;
  businessId: string;
  accountId: string;
  createdAt: string;
}

const users: User[] = [];
const businesses: Business[] = [];
const emails: QueuedEmail[] = [];

// Idempotency and basic rate limit
const lastSignupParamsByEmail = new Map<string, string>(); // email -> paramsHash
const lastSignupAtByEmail = new Map<string, number>(); // email -> timestamp

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function validatePayload(body: any): { ok: boolean; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};

  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const name = String(body?.name || '').trim();
  const phoneE164 = String(body?.phoneE164 || '').trim();
  const businessName = String(body?.businessName || '').trim();
  const businessType = body?.businessType as BusinessType;
  const termsAccepted = !!body?.termsAccepted;

  // Required
  if (!name) errors.name = 'Name is required';
  if (!email) errors.email = 'Email is required';
  if (!password) errors.password = 'Password is required';
  if (!phoneE164) errors.phone = 'Phone number is required';
  if (!businessName) errors.businessName = 'Business name is required';
  if (!businessType) errors.businessType = 'Business type is required';
  if (!termsAccepted) errors.terms = 'You must accept the Terms and Conditions to continue';

  // Email RFC basic
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password policy: min 8, letter + number
  if (password && !(password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password))) {
    errors.password = 'Password must be at least 8 characters and include at least 1 letter and 1 number';
  }

  // Phone +20 enforced; local digits typical 9–10
  if (phoneE164) {
    if (!phoneE164.startsWith('+20')) {
      errors.phone = 'Only Egypt phone numbers (+20) are allowed';
    } else {
      const local = phoneE164.replace(/^\+20/, '').replace(/\D/g, '');
      if (local.length < 9 || local.length > 10) {
        errors.phone = 'Enter a valid Egypt local number (9–10 digits)';
      }
    }
  }

  // Business type enum
  if (businessType && !BUSINESS_TYPES.includes(businessType)) {
    errors.businessType = 'Invalid business type';
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

export const authHandlers = [
  http.post('/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as SignupBody;

    // Normalize
    const normalized = {
      name: String(body?.name || '').trim(),
      email: String(body?.email || '').trim().toLowerCase(),
      password: String(body?.password || ''),
      phoneE164: String(body?.phoneE164 || '').trim(),
      businessName: String(body?.businessName || '').trim(),
      businessType: body?.businessType,
      termsAccepted: !!body?.termsAccepted,
    };

    // Rate limit: 60s per email
    const now = Date.now();
    const lastAt = lastSignupAtByEmail.get(normalized.email) || 0;
    if (now - lastAt < 60_000) {
      return new HttpResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
        }
      );
    }

    // Validate
    const { ok, errors } = validatePayload(normalized);
    if (!ok) {
      return HttpResponse.json({ errors }, { status: 400 });
    }

    // Idempotency dedupe by email + params hash (excluding volatile fields)
    const paramsForHash = {
      name: normalized.name,
      email: normalized.email,
      phoneE164: normalized.phoneE164,
      businessName: normalized.businessName,
      businessType: normalized.businessType,
      termsAccepted: normalized.termsAccepted,
    };
    const paramsHash = stableHash(paramsForHash);

    const existingHash = lastSignupParamsByEmail.get(normalized.email);
    const existingUser = users.find(u => u.email === normalized.email);

    if (existingHash && existingUser) {
      if (existingHash === paramsHash) {
        // Return existing with deduped
        const existingBiz = businesses.find(b => b.ownerId === existingUser.id)!;
        const accountId = existingBiz.id;
        return HttpResponse.json(
          {
            userId: existingUser.id,
            businessId: existingBiz.id,
            accountId,
            emailEnqueued: true,
            deduped: true,
          },
          { status: 200 }
        );
      }
      // Conflict: same email different params
      return HttpResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: 'A signup already exists for this email with different details.' },
        { status: 409 }
      );
    }

    // Create User + Business
    const userId = generateId('usr');
    const businessId = generateId('biz');
    const accountId = businessId; // simple mapping as "Account ID"

    const passwordHash = CryptoJS.SHA256(normalized.password).toString();
    const createdAtIso = new Date(now).toISOString();

    const user: User = {
      id: userId,
      name: normalized.name,
      email: normalized.email,
      phoneE164: normalized.phoneE164,
      passwordHash,
      createdAt: createdAtIso,
      termsAcceptedAt: createdAtIso,
    };
    users.push(user);

    const business: Business = {
      id: businessId,
      ownerId: userId,
      name: normalized.businessName,
      type: normalized.businessType as BusinessType,
      country: 'EG',
      createdAt: createdAtIso,
    };
    businesses.push(business);

    // Domain events
    try {
      eventStore.append(
        'user.created',
        { userId, email: user.email, name: user.name },
        {
          key: `signup:${user.email}:user`,
          params: paramsForHash,
          aggregate: { id: userId, type: 'user' },
        }
      );
      eventStore.append(
        'business.created',
        { businessId, ownerId: userId, name: business.name, type: business.type, country: business.country },
        {
          key: `signup:${user.email}:business`,
          params: paramsForHash,
          aggregate: { id: businessId, type: 'business' },
        }
      );
      eventStore.append(
        'terms.accepted',
        { userId, at: createdAtIso },
        {
          key: `signup:${user.email}:terms`,
          params: { email: user.email, at: createdAtIso },
          aggregate: { id: userId, type: 'user' },
        }
      );
    } catch (e) {
      // non-fatal for mocks
      console.warn('Event append failed:', e);
    }

    // Enqueue email
    const { subject, text, html } = welcomeEmail({
      name: user.name,
      accountId,
      email: user.email,
    });

    emails.push({
      to: user.email,
      subject,
      text,
      html,
      userId,
      businessId,
      accountId,
      createdAt: createdAtIso,
    });

    // Update idempotency tracking and rate limit
    lastSignupParamsByEmail.set(user.email, paramsHash);
    lastSignupAtByEmail.set(user.email, now);

    return HttpResponse.json(
      {
        userId,
        businessId,
        accountId,
        emailEnqueued: true,
      },
      { status: 201 }
    );
  }),

  // Debug endpoint to inspect queued emails (used by tests)
  http.get('/api/_debug/emails', () => {
    return HttpResponse.json(
      { emails },
      { status: 200 }
    );
  }),
];
