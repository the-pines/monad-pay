import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { UserIcon } from "@heroicons/react/24/outline";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#1E0E4A] pb-1 soft-shadow">
      <div className="relative mx-auto max-w-[393px] w-full h-[104px]">
        <div className="w-[393px] h-14" />

        <div className="w-[393px] h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/logo_white.png"
              alt="Monad"
              width={24}
              height={24}
            />
            <h1 className="font-bold text-[17px] leading-[22px] text-[--foreground]">
              Monad Pay
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/points" aria-label="Points">
              <Button size="md" className="animated-gradient text-black/90">
                1275 Points ✨
              </Button>
            </Link>
            <Link
              href="/settings"
              aria-label="Profile & settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20"
            >
              <span className="sr-only">Settings</span>
              <UserIcon className="w-5 h-5 text-white/90" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
