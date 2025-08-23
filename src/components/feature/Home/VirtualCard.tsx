import Image from "next/image";
import React from "react";
import { RiVisaLine } from "react-icons/ri";

type VirtualCardProps = {
  cardholderName: string;
  cardNumber: string;
  expiry: string; // e.g. "24/2028"
  cvv: string; // e.g. "210"
  className?: string;
};

export default function VirtualCard({
  cardholderName,
  cardNumber,
  expiry,
  cvv,
  className,
}: VirtualCardProps) {
  return (
    <div
      className={
        "virtual-card relative w-[335px] h-[199px] rounded-[25.0435px] border border-[#836EF9]/50 overflow-hidden soft-shadow " +
        // Rich diagonal gradient with subtle glass layer
        "bg-[radial-gradient(120%_120%_at_0%_0%,#7E67FF_0%,#5D3CF3_40%,#3B1BC9_70%,#2A1B68_100%)] " +
        (className ?? "")
      }
    >
      {/* Subtle texture overlay */}
      <Image
        src="/assets/worldmap.png"
        alt=""
        fill
        priority
        className="opacity-25 object-cover pointer-events-none"
      />

      <div className="absolute left-[9px] top-[6px] w-[309px] h-[175px]">
        {/* Logo moved to top-right */}
        <div className="absolute right-[0px] top-[0px] w-[40px] h-[40px]">
          <Image
            src="/assets/logo_white.png"
            alt="Monad"
            className="w-full h-full object-contain opacity-90"
            width={40}
            height={40}
          />
        </div>

        {/* Metallic chip */}
        <div
          className="absolute left-[0px] top-[0px] w-[42px] h-[32px] rounded-md"
          aria-hidden
        >
          <span className="block w-full h-full rounded-md bg-[linear-gradient(135deg,#D7D7D7_0%,#AFAFAF_40%,#F5F5F5_60%,#9C9C9C_100%)] opacity-90 border border-white/30"></span>
        </div>

        <div className="absolute left-[3px] top-[55px] w-[306px] h-[58px] text-white font-semibold text-2xl leading-[29px] tracking-widest">
          {formatCardNumber(cardNumber)}
        </div>

        <div className="absolute left-[3px] top-[96px] w-[180px] h-[32px] text-white font-semibold text-[13px] leading-4">
          {cardholderName}
        </div>

        <div className="absolute left-[3px] top-[128px] flex items-start gap-6">
          <div>
            <div className="text-[#200052] text-[12px] leading-[11px]">
              Expiry Date
            </div>
            <div className="text-white text-[15px] leading-4 mt-1">
              {expiry}
            </div>
          </div>
          <div>
            <div className="text-[#200052] text-[12px] leading-[11px]">CVV</div>
            <div className="text-white text-[15px] leading-4 mt-1">{cvv}</div>
          </div>
        </div>

        <div className="absolute right-[0px] bottom-[0px] mr-[10px] mb-[10px]">
          <RiVisaLine size={36} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(" ");
}
