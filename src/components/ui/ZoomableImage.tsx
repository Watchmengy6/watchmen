"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/feed/ImageLightbox";

/**
 * An <img> that opens a full-screen, zoomable ImageLightbox when tapped.
 * Use anywhere a graphic with small text (event flyers, group covers)
 * should be readable up close. Safe to use inside server components.
 */
export function ZoomableImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className={className}
      />
      {open ? (
        <ImageLightbox src={src} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
