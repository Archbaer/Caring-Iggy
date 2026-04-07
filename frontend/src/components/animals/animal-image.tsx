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
    className: "animal-card-image",
    sizes: "(max-width: 900px) 100vw, 33vw",
    width: 800,
    height: 600,
  },
  detail: {
    className: "animal-detail-image",
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
      <div className={`${imageVariant.className} ${imageVariant.className}--empty`} aria-hidden="true">
        <span>{animalType}</span>
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
      onError={() => setFailedSrc(src)}
    />
  );
}
