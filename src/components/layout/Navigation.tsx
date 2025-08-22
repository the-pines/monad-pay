'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SVGProps, ComponentType } from 'react';
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  href: string;
  label: string;
  Icon: IconComponent;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/transactions', label: 'Transactions', Icon: ArrowsRightLeftIcon },
  { href: '/vaults', label: 'Vaults', Icon: CubeIcon },
  { href: '/settings', label: 'Settings', Icon: Cog6ToothIcon },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#200052] mix-blend-normal backdrop-blur-none isolate pb-4 pb-[env(safe-area-inset-bottom)]">
      <div className="relative mx-auto max-w-[393px] h-12">
        <ul className="absolute left-0 top-1 w-[393px] h-12 flex flex-row items-start p-0">
          {navItems.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            const iconColor = isActive ? 'text-[#836EF9]' : 'text-white/50';
            const labelColor = isActive ? 'text-[#836EF9]' : 'text-white/50';
            return (
              <li key={href} className="w-[98.25px] h-12 flex-none grow">
                <Link href={href} className="relative block w-full h-full">
                  <Icon
                    className={`${iconColor} w-6 h-6 absolute left-1/2 -translate-x-1/2 top-[4px]`}
                    strokeWidth={2}
                  />
                  <span
                    className={`${labelColor} absolute left-1/2 -translate-x-1/2 top-[28px] font-bold text-[11px] leading-[135%] text-center`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
