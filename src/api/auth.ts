import { toE164EG } from '../components/PhoneInputEG';
import { postJSON } from './client';

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
