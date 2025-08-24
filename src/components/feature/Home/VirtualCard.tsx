'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { RiVisaLine } from 'react-icons/ri';
import { useMemo, useState, useCallback } from 'react';

type VirtualCardProps = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  className?: string;
  masked?: boolean;
};

export default function VirtualCard({
  cardholderName,
  cardNumber,
  expiry,
  cvc,
  className,
  masked = true,
}: VirtualCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const maskedNumber = useMemo(() => maskCardNumber(cardNumber), [cardNumber]);
  const groupedNumber = useMemo(
    () => groupCardNumber(cardNumber),
    [cardNumber]
  );

  const toggle = useCallback(() => setIsFlipped((p) => !p), []);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  return (
    <div
      className={clsx(
        'group relative w-[335px] sm:w-[360px] md:w-[380px] aspect-[1.68/1] cursor-pointer',
        className
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={isFlipped ? 'Show front of card' : 'Show back of card'}
      title="Tap or press Enter to flip"
      onClick={toggle}
      onKeyDown={onKeyDown}
      style={{ perspective: 1000 }}>
      <div
        className="relative size-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
        {/* FRONT */}
        <CardFace>
          <CardChrome />
          <CardContent
            cardholderName={cardholderName}
            number={masked ? maskedNumber : groupedNumber}
            expiry={expiry}
            cvc="***"
            rightBrand
          />
        </CardFace>

        {/* BACK */}
        <CardFace back>
          <CardChrome />
          <CardContent
            cardholderName={cardholderName}
            number={groupedNumber}
            expiry={expiry}
            cvc={cvc}
            rightBrand
          />
        </CardFace>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function CardFace({
  back = false,
  children,
}: {
  back?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'absolute inset-0 rounded-3xl overflow-hidden border border-white/10',
        'bg-[radial-gradient(120%_140%_at_-10%_-10%,#8A76F9_0%,#6d5be6_45%,#503fcf_75%,#2a1b68_100%)]',
        'shadow-[0_18px_45px_rgba(0,0,0,.35)] will-change-transform'
      )}
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
      {/* subtle world map */}
      <Image
        src="/assets/worldmap.png"
        alt=""
        fill
        priority
        className="pointer-events-none opacity-20 object-cover mix-blend-soft-light"
      />

      {/* corner glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-8 -left-10 size-44 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* diagonal shimmer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-md transition-transform duration-700 ease-out group-hover:translate-x-[220%]" />
      </div>

      {/* symmetric padding */}
      <div className="relative z-10 h-full p-5 md:p-6">{children}</div>
    </div>
  );
}

function CardChrome() {
  return (
    <>
      {/* Brand logo */}
      <div className="absolute right-4 top-4 z-10">
        <Image
          src="/assets/logo_white.png"
          alt="Monad Pay"
          width={40}
          height={40}
          className="opacity-90 object-contain"
        />
      </div>

      {/* Chip */}
      <div className="absolute left-4 top-4 z-10">
        <span className="block h-8 w-11 rounded-lg border border-white/30 bg-[linear-gradient(135deg,#d7d7d7_0%,#afafaf_40%,#f5f5f5_60%,#9c9c9c_100%)] opacity-90" />
      </div>
    </>
  );
}

function CardContent({
  cardholderName,
  number,
  expiry,
  cvc,
  rightBrand = false,
}: {
  cardholderName: string;
  number: string;
  expiry: string;
  cvc: string;
  rightBrand?: boolean;
}) {
  const groups = number.split(' '); // works for masked and grouped
  return (
    <div className="flex h-full flex-col">
      {/* Spacer at top for chip/logo */}
      <div className="flex-1" />

      {/* Card number, nudged lower */}
      <div className="mb-6">
        <div className="display text-white/95 tabular-nums tracking-[0.18em]">
          <div className="flex items-baseline justify-between gap-2">
            {groups.map((g, i) => (
              <span
                key={i}
                className="whitespace-nowrap text-[clamp(18px,4.2vw,22px)]">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-white font-semibold text-[13px] leading-4 truncate">
            {cardholderName}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-6">
            <div>
              <div className="text-white/60 text-[11.5px]">Expiry</div>
              <div className="text-white text-[14px] mt-0.5">{expiry}</div>
            </div>
            <div>
              <div className="text-white/60 text-[11.5px]">CVC</div>
              <div className="text-white text-[14px] mt-0.5">{cvc}</div>
            </div>
          </div>
        </div>

        {rightBrand && (
          <div className="shrink-0 translate-y-1">
            <RiVisaLine className="text-white/95" size={36} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function groupCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(.{4})/g, '$1 ').trim();
}
function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '*');
  return `**** **** **** ${last4}`.trim();
}
