import { toE164EG } from '../components/PhoneInputEG';

export type BusinessType =
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

export interface SignupInput {
  name: string;
  phoneLocal: string; // digits only local part
  email: string;
  password: string;
  businessName: string;
  businessType: BusinessType;
  termsAccepted: boolean;
}

export interface SignupResponse {
  userId: string;
  businessId: string;
  accountId: string;
  emailEnqueued: boolean;
  deduped?: boolean;
}

export async function postJSON<T>(url: string, body: any, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorText = `Request failed (${res.status})`;
    try {
      if (ct.includes('application/json')) {
        const err = await res.json();
        throw Object.assign(new Error(errorText), { status: res.status, data: err });
      } else {
        errorText = await res.text();
      }
    } catch (e) {
      if (e instanceof Error) throw e;
    }
    throw Object.assign(new Error(errorText), { status: res.status });
  }

  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON but got ${ct || 'unknown'} for ${url}: ${text.slice(0, 120)}...`);
  }

  return res.json() as Promise<T>;
}

export async function signup(input: SignupInput): Promise<SignupResponse> {
  const payload = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    phoneE164: toE164EG(input.phoneLocal),
    businessName: input.businessName.trim(),
    businessType: input.businessType,
    termsAccepted: !!input.termsAccepted,
  };

  return postJSON<SignupResponse>('/api/auth/signup', payload);
}
