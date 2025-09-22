import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Checkbox } from '../components';
import { PasswordInput } from '../components/PasswordInput';
import { PhoneInputEG, toE164EG } from '../components/PhoneInputEG';
import { Collapsible } from '../components/Collapsible';
import { AUTH_STRINGS } from '../locales/en/auth';
import { AutoCompleteInput, type AutoCompleteOption } from '../components/ui/AutoComplete';
import { validateEmail } from '../utils/validation';
import { signup as signupRequest, type BusinessType } from '../api/auth';

type Errors = Partial<Record<
  'name' | 'phone' | 'email' | 'password' | 'businessName' | 'businessType' | 'terms',
  string
>>;

export default function Signup() {
  const t = AUTH_STRINGS;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState(''); // digits only local part
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Refs for focus management on error
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const businessNameRef = useRef<HTMLInputElement>(null);

  const businessTypeOptions: BusinessType[] = t.signup.fields.businessType.options as unknown as BusinessType[];

  const businessTypeSearch = useMemo(() => {
    const all: AutoCompleteOption[] = businessTypeOptions.map((bt) => ({
      id: bt,
      label: bt,
      value: bt,
    }));
    return async (query: string): Promise<AutoCompleteOption[]> => {
      const q = query.trim().toLowerCase();
      if (!q) return all;
      return all.filter((o) => o.label.toLowerCase().includes(q));
    };
  }, [businessTypeOptions]);

  function validate(): Errors {
    const e: Errors = {};

    if (!name.trim()) e.name = t.signup.fields.name.required;

    // Phone: digits only, 9–10 digits for local, E.164 +20 built at submit
    const digits = phoneLocal.replace(/\D/g, '');
    if (!digits) {
      e.phone = t.signup.fields.phone.required;
    } else if (digits.length < 9 || digits.length > 10) {
      e.phone = t.signup.fields.phone.invalid;
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      e.email = t.signup.fields.email.required;
    } else {
      const r = validateEmail(emailTrimmed);
      if (!r.isValid) e.email = t.signup.fields.email.invalid;
    }

    // Password: min 8, at least 1 letter & 1 number
    if (!password) {
      e.password = t.signup.fields.password.required;
    } else {
      const hasLen = password.length >= 8;
      const hasLetter = /[A-Za-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!(hasLen && hasLetter && hasNumber)) {
        e.password = t.signup.fields.password.weak;
      }
    }

    if (!businessName.trim()) e.businessName = t.signup.fields.businessName.required;
    if (!businessType) e.businessType = t.signup.fields.businessType.required;
    if (!termsAccepted) e.terms = t.signup.fields.terms.required;

    return e;
  }

  const isFormValid = useMemo(() => {
    const e = validate();
    return Object.keys(e).length === 0;
  }, [name, phoneLocal, email, password, businessName, businessType, termsAccepted]);

  function focusFirstError(e: Errors) {
    if (e.name) return nameRef.current?.focus();
    if (e.phone) return phoneRef.current?.focus();
    if (e.email) return emailRef.current?.focus();
    if (e.password) return passwordRef.current?.focus();
    if (e.businessName) return businessNameRef.current?.focus();
    // businessType/terms are not direct inputs with refs here
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e);
      return;
    }

    setIsSubmitting(true);
    try {
      await signupRequest({
        name: name.trim(),
        phoneLocal: phoneLocal.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        password,
        businessName: businessName.trim(),
        businessType: businessType as BusinessType,
        termsAccepted,
      });

      navigate(t.routes.signupSuccess);
    } catch (err: any) {
      // Map server errors
      if (err?.status === 429) {
        setServerError(t.errors.rateLimited);
      } else if (err?.status === 409) {
        setServerError(t.errors.idempotencyConflict);
      } else if (err?.data?.errors) {
        setServerError(t.errors.serverValidation);
        setErrors((prev) => ({ ...prev, ...(err.data.errors as Errors) }));
      } else {
        setServerError(t.errors.unknown);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateAndSetErrors() {
    const e = validate();
    setErrors(e);
    return e;
  }

  return (
    <main role="main" className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">DashUp</h1>
          <p className="text-text-secondary mt-1">{t.signup.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-center">{t.signup.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate className="space-y-4" role="form">
              {serverError && (
                <div role="alert" className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {serverError}
                </div>
              )}

              <Input
                ref={nameRef}
                label={t.signup.fields.name.label}
                placeholder={t.signup.fields.name.placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={validateAndSetErrors}
                {...(errors.name && { error: errors.name })}
                required
                autoComplete="name"
                aria-label={t.signup.fields.name.label}
              />

              <PhoneInputEG
                ref={phoneRef}
                label={t.signup.fields.phone.label}
                helpText={t.signup.fields.phone.help}
                value={phoneLocal}
                onChange={setPhoneLocal}
                onBlur={validateAndSetErrors}
                {...(errors.phone && { error: errors.phone })}
                required
                aria-label={t.signup.fields.phone.label}
              />

              <Input
                ref={emailRef}
                label={t.signup.fields.email.label}
                placeholder={t.signup.fields.email.placeholder}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateAndSetErrors}
                {...(errors.email && { error: errors.email })}
                required
                autoComplete="email"
                aria-label={t.signup.fields.email.label}
              />

              <PasswordInput
                ref={passwordRef}
                label={t.signup.fields.password.label}
                placeholder={t.signup.fields.password.placeholder}
                helpText={t.signup.fields.password.help}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validateAndSetErrors}
                {...(errors.password && { error: errors.password })}
                required
                autoComplete="new-password"
                aria-label={t.signup.fields.password.label}
              />

              <Input
                ref={businessNameRef}
                label={t.signup.fields.businessName.label}
                placeholder={t.signup.fields.businessName.placeholder}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                onBlur={validateAndSetErrors}
                {...(errors.businessName && { error: errors.businessName })}
                required
                aria-label={t.signup.fields.businessName.label}
              />

              <div>
                <AutoCompleteInput
                  name="businessType"
                  label={t.signup.fields.businessType.label}
                  value={businessType || ''}
                  onChange={(val) => setBusinessType(val as BusinessType)}
                  searchFn={businessTypeSearch}
                  placeholder={t.signup.fields.businessType.placeholder}
                  required
                  {...(errors.businessType && { error: errors.businessType })}
                  allowCustomValue={true}
                  emptyMessage="No types found"
                  helpText="Start typing to search business types"
                  onBlur={validateAndSetErrors}
                  config={{ debounceMs: 0, minSearchLength: 0 }}
                />
              </div>

              <div>
                <Checkbox
                  label={t.signup.fields.terms.label}
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.currentTarget.checked)}
                  {...(errors.terms && { error: errors.terms })}
                  required
                />
                <div className="mt-2">
                  <Collapsible title={t.signup.fields.terms.detailsTitle} defaultOpen={false}>
                    {t.signup.fields.terms.detailsText}
                  </Collapsible>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? 'Submitting...' : t.signup.actions.submit}
              </Button>

              <div className="text-center">
                <Link to={t.routes.login} className="text-sm text-primary underline">
                  {t.signup.actions.loginLink}
                </Link>
              </div>

              {/* Hidden normalized phone for debugging/accessibility aids */}
              <input type="hidden" name="phoneE164" value={toE164EG(phoneLocal)} aria-hidden="true" />
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
