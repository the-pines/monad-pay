'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { generateRandomCardholder } from '@/lib/create-fake-form-data';
import { SERVER_WALLET_ADDRESS } from '@/config/contracts';
import { ERC20_TOKENS } from '@/config/tokens';
import { isAddress, type Address } from 'viem';
import { erc20Abi } from 'viem';
import { useConfig } from 'wagmi';
import { readContract } from 'wagmi/actions';
import {
  buildCardholderBody,
  createUser as createUserApi,
  ensureTokenApprovals,
  generateDOBWithinAgeRange,
} from '@/lib/signup';

type CardholderBody = Parameters<typeof buildCardholderBody>[0] extends never
  ? never
  : ReturnType<typeof buildCardholderBody>;

type Step = 1 | 2 | 3;

export default function SignUpPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const wagmiCfg = useConfig();

  // wizard
  const [step, setStep] = useState<Step>(1);

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

  // token selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // request state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'approving' | 'creating'>('idle');

  // persisted body between steps
  const [pendingBody, setPendingBody] = useState<CardholderBody | null>(null);

  // Inputs for DOB are hidden; values are generated automatically

  const onSubmitInfo = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      if (!address || !isAddress(address)) {
        setError('Wallet not connected');
        return;
      }

      const payload = buildCardholderBody({
        address,
        name,
        firstName,
        lastName,
        dob: { day: dobDay, month: dobMonth, year: dobYear },
        billing: { line1, city, state, postal_code: postalCode },
        email,
        phone,
      });

      setPendingBody(payload);
      // move to token selection
      setStep(2);
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
    setEmail(d.email ?? '');
    setPhone(d.phone_number ?? '');
  }, []);

  const onBack = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      router.replace('/login');
    }
  }, [disconnect, router]);

  const usdcToken = useMemo(
    () => ERC20_TOKENS.find((t) => t.symbol === 'USDC'),
    []
  );

  // ensure USDC is always selected
  useEffect(() => {
    if (step === 2 && usdcToken) {
      setSelected((prev) => ({ ...prev, [usdcToken.address]: true }));
    }
  }, [step, usdcToken]);

  const toggleToken = useCallback((addr: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      next[addr] = !next[addr];
      return next;
    });
  }, []);

  const selectedTokens = useMemo(
    () => ERC20_TOKENS.filter((t) => selected[t.address]),
    [selected]
  );

  const approveSelected = useCallback(async () => {
    if (!address || !pendingBody) return;
    if (!usdcToken) {
      setError('USDC not configured');
      return;
    }
    if (!SERVER_WALLET_ADDRESS || !isAddress(SERVER_WALLET_ADDRESS)) {
      setError('Delegator address is not configured');
      return;
    }
    setSubmitting(true);
    setPhase('approving');
    setError(null);

    try {
      // sequentially approve selected tokens if not already approved
      await ensureTokenApprovals({
        config: wagmiCfg,
        owner: address as Address,
        spender: SERVER_WALLET_ADDRESS as Address,
        tokens: selectedTokens,
      });

      // verify USDC allowance
      const usdcAllowance = (await readContract(wagmiCfg, {
        address: usdcToken.address as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as Address, SERVER_WALLET_ADDRESS as Address],
      })) as bigint;

      if (usdcAllowance === BigInt(0)) {
        throw new Error('USDC approval required to proceed');
      }

      // create account after approvals
      setPhase('creating');
      await createUserApi(pendingBody);
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      setError(msg);
      setSubmitting(false);
      setPhase('idle');
    }
  }, [address, pendingBody, selectedTokens, usdcToken, wagmiCfg, router]);

  useEffect(() => {
    if (!isConnected) router.replace('/login?next=/signup');
  }, [isConnected, router]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-40 -translate-x-1/2 w-[120%] h-56 rounded-[56px] opacity-60 blur-2xl animated-gradient -rotate-6" />

      <section className="relative z-10 mx-auto flex min-h-[100svh] max-w-[640px] flex-col items-center justify-between px-6 py-10">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white text-sm flex items-center gap-2">
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
              {step === 1 && 'Set up your account'}
              {step === 2 && 'Select tokens to approve'}
              {step === 3 && 'Approve selected tokens'}
            </h1>
            {step === 1 && (
              <p className="text-white/70 text-sm leading-relaxed max-w-[46ch] mx-auto">
                We need some more details to set up your card. Feel free to put
                a pseudonym
              </p>
            )}
            {step === 2 && (
              <p className="text-white/70 text-sm leading-relaxed max-w-[56ch] mx-auto">
                Choose which ERC20s to grant spending approval to our settlement
                wallet.
                <span className="ml-1 font-medium text-white">
                  USDC is required.
                </span>
              </p>
            )}
            {step === 3 && (
              <p className="text-white/70 text-sm leading-relaxed max-w-[56ch] mx-auto">
                Confirm the approval transactions in your wallet. This lets the
                card settle payments on your behalf
              </p>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
            {step === 1 && (
              <form onSubmit={onSubmitInfo} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-xs font-medium text-white/80">
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
                  className="w-full rounded-2xl py-3 font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 animated-gradient">
                  Next
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {ERC20_TOKENS.map((t) => {
                    const checked = !!selected[t.address];
                    const isUsdc = t.symbol === 'USDC';
                    return (
                      <label
                        key={t.address}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {t.symbol}
                          </span>
                          <span className="text-xs text-white/60">
                            {t.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isUsdc ? true : checked}
                          onChange={() =>
                            !isUsdc ? toggleToken(t.address) : null
                          }
                          disabled={isUsdc}
                          className="h-4 w-4"
                        />
                      </label>
                    );
                  })}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-2xl py-3 font-semibold border border-white/15">
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-2xl py-3 font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 animated-gradient">
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/80 mb-2">Approving for:</p>
                  <ul className="text-sm text-white/70 list-disc ml-5 space-y-1">
                    {selectedTokens.map((t) => (
                      <li key={t.address}>{t.symbol}</li>
                    ))}
                  </ul>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200/40 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="flex-1 rounded-2xl py-3 font-semibold border border-white/15 disabled:opacity-60">
                    Back
                  </button>
                  <button
                    onClick={approveSelected}
                    disabled={submitting}
                    className="flex-1 rounded-2xl py-3 font-semibold text-black/90 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 animated-gradient disabled:opacity-60">
                    {submitting
                      ? phase === 'approving'
                        ? 'Approve in wallet...'
                        : 'Creating account...'
                      : 'Approve tokens'}
                  </button>
                </div>
                <p className="text-xs text-white/60 text-center">
                  If you selected several tokens, you&apos;ll see several
                  prompts
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1" />
      </section>
    </main>
  );
}
