import type { ReactNode } from "react";
import { Link } from "wouter";
import { Button, cn } from "@lila-care/design-system";
import { CHECK_ICON, PHASE_COLORS, CTA_HREF, type Phase } from "./landingContent";

export function PhaseDot({
  phase,
  size = 12,
}: {
  phase: Phase;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: PHASE_COLORS[phase] }}
    />
  );
}

export function CheckItem({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <li className="flex items-start gap-2.5">
      <img src={CHECK_ICON} alt="" width={20} height={20} className="mt-0 shrink-0" />
      <span
        className={cn(
          "min-w-0 text-sm leading-5",
          tone === "light" ? "text-white" : "text-[color:var(--text-primary)]",
        )}
      >
        {children}
      </span>
    </li>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-['DM_Sans'] text-[10px] font-medium leading-[14px] tracking-normal text-[color:var(--brand-primary)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Global `a:hover` in index.css is unlayered, so hover colors need `!` to win. */
const CTA_CLASS =
  "h-12 w-full font-['Poppins'] text-base font-medium sm:w-auto";

export function PrimaryCta({
  children,
  className,
  href = CTA_HREF,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <Button
      asChild
      variant="brand"
      size="lg"
      className={cn(
        CTA_CLASS,
        "bg-gradient-to-r rounded-full px-6 text-white hover:text-white!",
        className,
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function OutlineCta({
  children,
  className,
  href,
  local = true,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  local?: boolean;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(
        CTA_CLASS,
        "rounded-lg border-[1.5px] bg-white px-6 text-primary shadow-none hover:bg-secondary hover:text-primary!",
        className,
      )}
    >
      {local ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>}
    </Button>
  );
}

export function SectionContainer({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "mx-auto w-full max-w-[1440px] px-5 md:px-10 xl:px-[120px]",
        id && "scroll-mt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Phone mockup exported from Figma. The 440x640 box mirrors the design's `visual`
 * frame; percentages keep the composition proportional down to 375px.
 */
export function PhoneVisual({
  src,
  alt,
  haloColor,
}: {
  src: string;
  alt: string;
  haloColor: string;
}) {
  return (
    <div className="relative aspect-[440/640] w-full max-w-[440px] shrink-0">
      <div
        aria-hidden="true"
        className="absolute left-[6.8%] top-[20.3%] h-[59.4%] w-[86.4%] rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${haloColor} 0%, transparent 70%)`,
        }}
      />
      <img
        src={src}
        alt={alt}
        className="absolute left-[6.57%] top-0 h-auto w-[86.8%] max-w-none"
      />
    </div>
  );
}
