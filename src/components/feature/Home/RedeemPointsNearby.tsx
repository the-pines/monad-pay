"use client";

import React from "react";

const GOOGLE_MAPS_DEEP_LINK = "https://maps.app.goo.gl/XzZoiNBevKfLACNW7";

const EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(
  "PUBLICO Reforma, Mexico City"
)}&z=16&output=embed`;

export default function RedeemPointsNearby() {
  return (
    <>
      <div className="mt-6"></div>
      <h2 className="text-sm font-medium tracking-wide text-[--foreground]/70">
        Redeem points near me
      </h2>
      <div className="mb-4 flex items-center justify-between"></div>
      <div className="overflow-hidden rounded-2xl border border-[#2A2638] bg-white/5 soft-shadow">
        <div className="relative aspect-[16/9] w-full p-2">
          <iframe
            title="Redeem Points Nearby Map"
            src={EMBED_SRC}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-2 rounded-xl h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
          />

          {/* Clickable overlay to open the exact Maps deep link */}
          <a
            href={GOOGLE_MAPS_DEEP_LINK}
            target="_blank"
            rel="noreferrer noopener"
          >
            Publico
          </a>
        </div>
      </div>
    </>
  );
}
