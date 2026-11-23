"use client";

import Image from "next/image";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { IconTile, type Accent } from "./Card";

const BOX = { sm: "size-12 rounded-xl", md: "size-16 rounded-xl", lg: "size-20 rounded-2xl" } as const;
const PX = { sm: 48, md: 64, lg: 80 } as const;

/**
 * Square photo for list rows and cards. Falls back to the category icon when there is
 * no photo or it fails to load (private or missing files).
 */
export function Thumb({
  src,
  alt = "",
  icon,
  accent,
  size = "md",
}: {
  src?: string;
  alt?: string;
  icon: LucideIcon;
  accent?: Accent;
  size?: keyof typeof BOX;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) return <IconTile icon={icon} accent={accent} size={size === "sm" ? "md" : "lg"} />;
  return (
    <span className={`relative block flex-none overflow-hidden bg-sand-deep ${BOX[size]}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${PX[size] * 2}px`}
        unoptimized={src.startsWith("data:")}
        className="object-cover"
        onError={() => setBroken(src)}
      />
    </span>
  );
}

/** Wide 4:3 photo for cards and detail pages, with the same icon fallback. */
export function Photo({ src, alt = "", icon, accent, className = "" }: { src?: string; alt?: string; icon: LucideIcon; accent?: Accent; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src)
    return (
      <span className={`flex aspect-4/3 items-center justify-center rounded-2xl bg-sand-deep ${className}`}>
        <IconTile icon={icon} accent={accent} size="lg" />
      </span>
    );
  return (
    <span className={`relative block aspect-4/3 overflow-hidden rounded-2xl bg-sand-deep ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 640px, 100vw" unoptimized={src.startsWith("data:")} className="object-cover" onError={() => setBroken(src)} />
    </span>
  );
}
