/**
 * Shared 1080×1350px wrapper for every carousel slide.
 * Provides: near-black bg, dot grid, gradient orbs, progress bar, watermark, counter.
 */
export default function SlideChrome({
  slideNumber,
  totalSlides,
  children,
}: {
  slideNumber: number;
  totalSlides: number;
  children: React.ReactNode;
}) {
  const progress = (slideNumber / totalSlides) * 100;

  return (
    <div
      style={{ width: 1080, height: 1350 }}
      className="relative overflow-hidden"
    >
      {/* Base background */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Gradient orb — top right (purple) */}
      <div
        className="absolute -top-[200px] -right-[200px] h-[600px] w-[600px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)",
        }}
      />

      {/* Gradient orb — bottom left (cyan) */}
      <div
        className="absolute -bottom-[150px] -left-[150px] h-[500px] w-[500px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)",
        }}
      />

      {/* Slide counter — top right */}
      <div
        className="absolute top-[40px] right-[48px] z-10 font-mono text-[20px] tracking-wider"
        style={{ color: "#71717a" }}
      >
        {slideNumber}/{totalSlides}
      </div>

      {/* Content area */}
      <div className="relative z-10 flex h-full w-full flex-col px-[72px] pt-[80px] pb-[100px]">
        {children}
      </div>

      {/* Kllivo watermark — bottom left */}
      <div
        className="absolute bottom-[44px] left-[72px] z-10 flex items-center gap-[10px]"
        style={{ opacity: 0.3 }}
      >
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#a855f7" />
          <path d="M10.5 8v16M10.5 16l9.5-8M10.5 16l9.5 8" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[24px] font-semibold tracking-tight text-white">
          Kllivo
        </span>
      </div>

      {/* Progress bar — bottom */}
      <div className="absolute bottom-0 left-0 z-10 h-[4px] w-full bg-white/5">
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #a855f7, #06b6d4)",
          }}
        />
      </div>
    </div>
  );
}
