/** The real Dhara Elegance mark (public/logo-512.png, made from logo.png), tinted with brand colours via a CSS mask. */
export function LogoMark({ size = 44, className = "bg-navy" }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Dhara Elegance logo"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        maskImage: "url(/logo-512.png)",
        WebkitMaskImage: "url(/logo-512.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export function Logo({ size = 44, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} className={light ? "bg-gold" : "bg-navy"} />
      <span className={`flex flex-col leading-none ${light ? "text-cream" : "text-navy"}`}>
        <span className="font-display text-lg font-semibold tracking-[0.28em] sm:text-xl">DHARA</span>
        <span className="text-[9px] font-semibold tracking-[0.55em] text-gold">ELEGANCE</span>
      </span>
    </span>
  );
}
