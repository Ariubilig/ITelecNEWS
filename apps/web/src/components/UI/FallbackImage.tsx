import { useState } from "react";

interface FallbackImageProps {
  src: string | null;
  alt: string;
  className: string;
  /** Class for the placeholder div shown when `src` is missing or fails to load. */
  fallbackClassName: string;
}

/**
 * Lazy `<img>` that swaps to an empty placeholder div when the source is
 * missing or fails to load. Extracted from the home and admin cards, which
 * both repeated the same `imgFailed` state + onError fallback.
 */
export function FallbackImage({ src, alt, className, fallbackClassName }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={fallbackClassName} aria-hidden="true" />;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
