"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function PointsPage() {
  const router = useRouter();

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#FBFAF9]"
      >
        <ArrowLeftIcon className="w-5 h-5" aria-hidden="true" />
        <span className="text-base">Back</span>
      </button>
      <h1 className="text-xl font-semibold mb-4">My Points</h1>
    </div>
  );
}
