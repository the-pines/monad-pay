'use client';

import React from 'react';

export default function VaultDetailSkeleton() {
  return (
    <div className="flex flex-col text-xl items-start w-[393px] mx-auto relative">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%22.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%%22 height=%22100%%22 filter=%22url(%23n)%22/></svg>')]" />

      <div className="flex flex-col items-start w-full bg-[#200052] p-4 relative z-10">
        <div className="flex items-center gap-2 text-[#FBFAF9]">
          <div className="w-6 h-6 rounded-md bg-white/10 animate-pulse" />
          <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="mt-3 h-6 w-40 rounded bg-white/10 animate-pulse" />
        <div className="mt-4">
          <div className="w-[160px] h-[160px] rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>

      <div className="w-full bg-[#200052] px-4 pb-4 relative z-10">
        <div className="mt-3 w-[362px]">
          <div className="flex gap-3">
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] p-3">
              <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
              <div className="mt-2 h-5 w-24 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="w-[175px] h-[80px] rounded-2xl bg-[rgba(251,250,249,0.06)] p-3">
              <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
              <div className="mt-2 h-5 w-20 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-[40px] rounded-lg bg-white/10 animate-pulse" />
            <div className="mt-2 w-full h-[40px] rounded-lg bg-white/10 animate-pulse" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-center">
            <div className="h-[34px] w-[220px] rounded-lg bg-white/10 animate-pulse" />
          </div>
          <div className="mt-2 h-4 w-64 rounded bg-white/10 animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
}
