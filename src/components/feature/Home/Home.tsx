'use client';

import { useUser } from '@/contexts/UserContext';
import Portfolio from '@/components/feature/Home/Portfolio';
import VirtualCard from '@/components/feature/Home/VirtualCard';
import RecentTransactions from '@/components/feature/Home/RecentTransactions';
import RedeemPointsNearby from './RedeemPointsNearby';

export default function Home() {
  const { user, balance } = useUser();

  return (
    <section className="relative p-5">
      <div className="text-[#FBFAF9] font-extrabold text-[36px] leading-[44px] tracking-[-0.02em]">
        ${balance}
      </div>

      <div className="mt-7 flex justify-center">
        <VirtualCard
          cardholderName={user.card.displayName}
          cardNumber={user.card.number}
          expiry={user.card.expiry}
          cvc={user.card.cvc}
        />
      </div>

      <Portfolio />
      <RecentTransactions />
      <RedeemPointsNearby />
    </section>
  );
}
