"use client";

import Image from "next/image";
import { Globe2 } from "lucide-react";
import { useMemo, useState } from "react";

export function SourceAvatar({
  url,
  name,
  size = "md",
}: {
  url: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = useMemo(() => getFaviconUrl(url), [url]);
  const dimensions = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const className =
    size === "sm"
      ? "size-7 rounded-lg"
      : size === "lg"
        ? "size-11 rounded-xl"
        : "size-9 rounded-[10px]";

  if (!faviconUrl || failed) {
    return (
      <span
        aria-label={name}
        className={`flex shrink-0 items-center justify-center border border-white/[0.08] bg-white/[0.045] text-white/45 ${className}`}
      >
        <Globe2 className={size === "lg" ? "size-5" : "size-4"} strokeWidth={1.8} />
      </span>
    );
  }

  return (
    <span className={`relative shrink-0 overflow-hidden border border-white/[0.08] bg-white ${className}`}>
      <Image
        src={faviconUrl}
        alt={`${name} favicon`}
        width={dimensions}
        height={dimensions}
        unoptimized
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </span>
  );
}

function getFaviconUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url.origin)}&sz=128`;
  } catch {
    return null;
  }
}
