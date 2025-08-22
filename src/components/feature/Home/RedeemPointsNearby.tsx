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
      <h2 className="text-[17px] font-semibold text-[--foreground]">
        Redeem points near me
      </h2>
      <div className="mb-3 flex items-center justify-between"></div>
      <div className="overflow-hidden rounded-xl border border-[#2A2638]">
        <div className="relative aspect-[16/9] w-full">
          <iframe
            title="Redeem Points Nearby Map"
            src={EMBED_SRC}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full"
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
