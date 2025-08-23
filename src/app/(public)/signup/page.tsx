'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount } from '@reown/appkit/react';
import { generateRandomCardholder } from '@/lib/create-fake-form-data';

type CardholderBody = {
  user: { name: string; address: string; provider: string };
  cardholder: {
    name: string;
    individual: {
      first_name: string;
      last_name: string;
      dob: { day: number; month: number; year: number };
    };
    billing: {
      address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: 'GB';
      };
    };
    email?: string;
    phone_number?: string;
    metadata?: Record<string, string>;
  };
};

async function createUser(body: CardholderBody): Promise<void> {
  const res = await fetch('/api/create-user', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Failed to create user');
    throw new Error(text || 'Failed to create user');
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();

  // Required
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobDay, setDobDay] = useState<number>(1);
  const [dobMonth, setDobMonth] = useState<number>(1);
  const [dobYear, setDobYear] = useState<number>(1990);

  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Optional
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const start = 1940;
    return Array.from({ length: now - start + 1 }, (_, i) => now - i);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const payload: CardholderBody = {
        user: {
          name: `${firstName} ${lastName}`,
          address: address!,
          provider: 'wallet',
        },
        cardholder: {
          name: name.trim(),
          individual: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            dob: { day: dobDay, month: dobMonth, year: dobYear },
          },
          billing: {
            address: {
              line1: line1.trim(),
              line2: undefined,
              city: city.trim(),
              state: state.trim(),
              postal_code: postalCode.trim(),
              country: 'GB',
            },
          },
          email: email.trim() || undefined,
          phone_number: phone.trim() || undefined,
          metadata: undefined,
        },
      };

      setSubmitting(true);

      try {
        await createUser(payload);
        router.replace('/');
      } catch (err) {
        console.log(err);
        setError('Failed to create cardholder');
      } finally {
        setSubmitting(false);
      }
    },
    [
      address,
      name,
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      line1,
      city,
      state,
      postalCode,
      email,
      phone,
      router,
    ]
  );

  const fillWithDemoData = useCallback(() => {
    const d = generateRandomCardholder();
    setName(d.name);
    setFirstName(d.individual.first_name);
    setLastName(d.individual.last_name);
    setDobDay(d.individual.dob.day);
    setDobMonth(d.individual.dob.month);
    setDobYear(d.individual.dob.year);
    setLine1(d.billing.address.line1);
    setCity(d.billing.address.city);
    setState(d.billing.address.state);
    setPostalCode(d.billing.address.postal_code);
    setEmail(d.email ?? '');
    setPhone(d.phone_number ?? '');
  }, []);

  useEffect(() => {
    if (!isConnected) router.replace('/login?next=/signup');
  }, [isConnected, router]);

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create cardholder</h1>
        <button
          type="button"
          onClick={fillWithDemoData}
          className="rounded-md border px-3 py-1 text-sm">
          Fill with demo data
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Display name */}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Card name (max ~24)*
          </label>
          <input
            id="name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Alex Johnson"
          />
        </div>

        {/* Individual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              First name*
            </label>
            <input
              value={firstName}
              required
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Alex"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Last name*</label>
            <input
              value={lastName}
              required
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Johnson"
            />
          </div>
        </div>

        {/* DOB */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Date of birth*
          </label>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={dobDay}
              required
              onChange={(e) => setDobDay(Number(e.target.value))}
              className="rounded-md border px-3 py-2">
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={dobMonth}
              required
              onChange={(e) => setDobMonth(Number(e.target.value))}
              className="rounded-md border px-3 py-2">
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={dobYear}
              required
              onChange={(e) => setDobYear(Number(e.target.value))}
              className="rounded-md border px-3 py-2">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Billing address */}
        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium">Billing address*</legend>
          <input
            placeholder="Address line 1"
            value={line1}
            required
            onChange={(e) => setLine1(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="City"
              value={city}
              required
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
            <input
              placeholder="State / County"
              value={state}
              required
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Postal code"
              value={postalCode}
              required
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </fieldset>

        {/* Optional contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="alex@example.co.uk"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Phone (optional)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="+447700900123"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {submitting ? 'Signing Up' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
