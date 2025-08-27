"use client";

import { useUser } from "@/contexts/UserContext";
import Portfolio from "@/components/feature/Home/Portfolio";
import VirtualCard from "@/components/feature/Home/VirtualCard";
import RecentTransactions from "@/components/feature/Home/RecentTransactions";
import RedeemPointsNearby from "./RedeemPointsNearby";
import Button from "@/components/ui/Button";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

export default function Home() {
  const { user, balance } = useUser();

  return (
    <section className='relative p-5'>
      <div className='flex items-center justify-between gap-4'>
        <div className='text-[#FBFAF9] font-extrabold text-[36px] leading-[44px] tracking-[-0.02em]'>
          ${balance}
        </div>
        <a
          href='https://shop.usemonadpay.com/'
          target='_blank'
          rel='noopener noreferrer'
        >
          <Button size='sm' variant='secondary' className='!rounded-xl gap-1.5'>
            <span>Spend here</span>
            <ArrowTopRightOnSquareIcon className='h-4 w-4' />
          </Button>
        </a>
      </div>

      <div className='mt-7 flex justify-center'>
        <VirtualCard
          cardholderName={user.card.displayName}
          cardNumber={user.card.number}
          expiry={user.card.expiry}
          cvc={user.card.cvc}
        />
      </div>

      <Portfolio />
      <div className='my-5 h-px bg-white/10' />
      <RecentTransactions />
      <div className='my-5 h-px bg-white/10' />
      <RedeemPointsNearby />
    </section>
  );
}
