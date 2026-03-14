/**
 * Kllivo logo mark — geometric "K" in a purple gradient rounded square.
 * Used across Navbar, footer, compare pages, and carousel watermarks.
 */

const SIZES = {
  xs: { box: 16, stroke: 2.5, rx: 3.5 },
  sm: { box: 20, stroke: 3, rx: 4.5 },
  md: { box: 28, stroke: 3.5, rx: 6 },
  lg: { box: 40, stroke: 3.5, rx: 7 },
  xl: { box: 64, stroke: 3.5, rx: 7 },
} as const;

type LogoSize = keyof typeof SIZES;

export default function KllivoLogo({
  size = "md",
  showText = false,
  className = "",
  textClassName = "",
}: {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
  /** Override text styling when showText is true */
  textClassName?: string;
}) {
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient
            id={`kllivo-bg-${size}`}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx={s.rx} fill={`url(#kllivo-bg-${size})`} />
        <path
          d="M10.5 8v16M10.5 16l9.5-8M10.5 16l9.5 8"
          stroke="#fff"
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={textClassName || "text-lg font-semibold tracking-tight"}>
          Kllivo
        </span>
      )}
    </span>
  );
}

/**
 * Inline SVG for contexts where React components can't be used (e.g. carousel screenshots).
 * Returns raw SVG markup string at the given pixel size.
 */
export function kllivoLogoSvgMarkup(pixelSize: number): string {
  return `<svg width="${pixelSize}" height="${pixelSize}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="kbg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#9333ea"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#kbg)"/><path d="M10.5 8v16M10.5 16l9.5-8M10.5 16l9.5 8" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
