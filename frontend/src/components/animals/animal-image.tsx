"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type AnimalImageProps = {
  imageUrl: string | null;
  name: string;
  animalType: string;
  variant: "card" | "detail";
};

const imageVariants = {
  card: {
    className: "w-full h-full object-cover",
    sizes: "(max-width: 900px) 100vw, 33vw",
    width: 800,
    height: 600,
  },
  detail: {
    className: "w-full h-full object-cover rounded-2xl",
    sizes: "(max-width: 900px) 100vw, 50vw",
    width: 1000,
    height: 800,
  },
} as const;

export function AnimalImage({ imageUrl, name, animalType, variant }: AnimalImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = useMemo(() => imageUrl?.trim() || null, [imageUrl]);
  const imageVariant = imageVariants[variant];

  if (!src || failedSrc === src) {
    return (
      <div className="w-full h-full bg-[var(--color-primary-pale)] flex items-center justify-center" aria-hidden="true">
        <span className="text-[var(--color-primary)] font-bold text-lg">{animalType}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${name} profile`}
      className={imageVariant.className}
      sizes={imageVariant.sizes}
      width={imageVariant.width}
      height={imageVariant.height}
      unoptimized
      onError={() => setFailedSrc(src)}
    />
  );
}
