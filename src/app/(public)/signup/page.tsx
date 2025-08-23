"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { generateRandomCardholder } from "@/lib/create-fake-form-data";

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
        country: "GB";
      };
    };
    email?: string;
    phone_number?: string;
    metadata?: Record<string, string>;
  };
};

async function createUser(body: CardholderBody): Promise<void> {
  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Failed to create user";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") {
        message = data.error;
      } else if (typeof data?.message === "string") {
        message = data.message;
      } else if (data) {
        message = JSON.stringify(data);
      }
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }
}

function generateDOBWithinAgeRange(minAge: number, maxAge: number) {
  const now = new Date();
  const latestDOB = new Date(now);
  latestDOB.setFullYear(now.getFullYear() - minAge);
  const earliestDOB = new Date(now);
  earliestDOB.setFullYear(now.getFullYear() - maxAge);

  const randomTime =
    earliestDOB.getTime() +
    Math.random() * (latestDOB.getTime() - earliestDOB.getTime());
  const d = new Date(randomTime);
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function SignUpPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  // Required
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobDay, setDobDay] = useState<number>(1);
  const [dobMonth, setDobMonth] = useState<number>(1);
  const [dobYear, setDobYear] = useState<number>(1990);

  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Optional
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inputs for DOB are hidden; values are generated automatically

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const payload: CardholderBody = {
        user: {
          name: `${firstName} ${lastName}`,
          address: address!,
          provider: "wallet",
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
              country: "GB",
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
        router.replace("/");
      } catch (err) {
        console.log(err);
        const serverMsg = err instanceof Error ? err.message : "";
        const suffix =
          serverMsg && serverMsg !== "Failed to create user"
            ? ` — ${serverMsg}`
            : "";
        setError(`Failed to create account${suffix}`);
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

  // Prefill hidden fields with demo data and valid DOB (18-65)
  useEffect(() => {
    const d = generateRandomCardholder();
    const dob = generateDOBWithinAgeRange(18, 65);
    setDobDay(dob.day);
    setDobMonth(dob.month);
    setDobYear(dob.year);
    setLine1(d.billing.address.line1);
    setCity(d.billing.address.city);
    setState(d.billing.address.state);
    setPostalCode(d.billing.address.postal_code);
    setEmail(d.email ?? "");
    setPhone(d.phone_number ?? "");
  }, []);

  useEffect(() => {
    if (!isConnected) router.replace("/login?next=/signup");
  }, [isConnected, router]);

  const onBack = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      router.replace("/login");
    }
  }, [disconnect, router]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 w-[120%] h-56 rounded-[56px] opacity-60 blur-2xl animated-gradient -rotate-6" />

      <section className="relative z-10 mx-auto flex min-h-[100svh] max-w-[640px] flex-col items-center justify-between px-6 py-10">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white text-sm flex items-center gap-2"
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white/15 grid place-items-center">
              ←
            </span>
            Back to login
          </button>

          <div className="flex items-center gap-2 opacity-80">
            <Image
              src="/assets/logo_white.png"
              alt="Monad Pay"
              width={20}
              height={20}
            />
            <span className="text-xs uppercase tracking-wide">Monad Pay</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="w-full max-w-[640px]">
          <div className="text-center space-y-3 mb-6">
            <h1 className="display text-3xl sm:text-[32px] font-semibold leading-tight">
              Set up your account
            </h1>
            <p className="text-white/70 text-sm leading-relaxed max-w-[46ch] mx-auto">
              We need some more details to set up your card. Feel free to put a
              pseudonym
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Display name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-xs font-medium text-white/80"
                >
                  Display name (max 24 characters)*
                </label>
                <input
                  id="name"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="MonadRox"
                />
                <p className="mt-1 text-xs text-white/60">
                  This will be displayed on your card. No special characters
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">
                    First name*
                  </label>
                  <input
                    value={firstName}
                    required
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">
                    Last name*
                  </label>
                  <input
                    value={lastName}
                    required
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Johnson"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl py-3 font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 animated-gradient disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create account"}
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1" />
      </section>
    </main>
  );
}
