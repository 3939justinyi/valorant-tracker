import { useEffect, useState } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Character shown when the image is missing/unreachable (defaults to first letter of alt). */
  fallbackText?: string;
}

/**
 * <img> that degrades to a letter tile when the CDN is unreachable or the
 * content API returned no icon — the app must work fully offline (mock mode).
 */
export default function FallbackImg({ src, alt, className = '', fallbackText }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-val-border/40 text-val-muted font-bold uppercase select-none ${className}`}
      >
        {(fallbackText ?? alt ?? '?').slice(0, 1)}
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}
