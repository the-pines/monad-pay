import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#200052] pb-1">
      <div className="relative mx-auto max-w-[393px] w-full h-[104px]">
        <div className="w-[393px] h-14" />

        <div className="w-[393px] h-12 flex items-center justify-between px-4">
          <h1 className="font-bold text-[17px] leading-[22px] text-[--foreground]">
            Monad Pay
          </h1>

          <Link
            href="/points"
            className="inline-flex items-center justify-center h-10 px-4 rounded-2xl bg-[#C0186A] text-white font-bold text-[17px] leading-[22px]"
          >
            1275 Points
          </Link>
        </div>
      </div>
    </header>
  );
}
