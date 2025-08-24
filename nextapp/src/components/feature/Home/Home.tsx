'use client';

import Portfolio from '@/components/feature/Home/Portfolio';
import VirtualCard from '@/components/feature/Home/VirtualCard';
import RecentTransactions from '@/components/feature/Home/RecentTransactions';
import RedeemPointsNearby from './RedeemPointsNearby';
import { usePortfolio, useVirtualCardDisplay } from '@/hooks';
import { useUser } from '@/contexts/UserContext';

export default function Home() {
  const { totalUsd } = usePortfolio();
  const { data: card } = useVirtualCardDisplay();

  const { user } = useUser();

  return (
    <section className="relative p-5">
      <div className="text-[#FBFAF9] font-extrabold text-[36px] leading-[44px] tracking-[-0.02em]">
        {typeof totalUsd === 'number'
          ? `$${totalUsd.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}`
          : '$0'}
      </div>

      <div className="mt-7 flex justify-center">
        <VirtualCard
          cardholderName={card?.cardholderName ?? ''}
          cardNumber={card?.cardNumber ?? ''}
          expiry={card?.expiry ?? ''}
          cvv={card?.cvv ?? ''}
        />
      </div>

      <Portfolio />
      <RecentTransactions />
      <RedeemPointsNearby />
    </section>
  );
}
