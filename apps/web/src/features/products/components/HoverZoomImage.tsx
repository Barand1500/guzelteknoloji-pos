interface HoverZoomImageProps {
  src: string;
  alt: string;
  /** Küçük resmin sınıfları (boyut, kenarlık vb.). */
  className: string;
}

/** Küçük resim; üzerine gelince (ya da odaklanınca) büyük hali altında belirir. Dokunmatikte etkisizdir. */
export function HoverZoomImage({ src, alt, className }: HoverZoomImageProps) {
  return (
    <span className="group/zoom relative inline-block shrink-0">
      <img src={src} alt={alt} className={className} />
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-0 z-40 mt-2 hidden size-52 rounded-3xl border border-line bg-surface-raised object-cover shadow-card group-hover/zoom:block"
      />
    </span>
  );
}
