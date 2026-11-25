import { cn } from "@lila-care/design-system";
import appleIcon from "../assets/landing/icon-apple.svg";
import googlePlayIcon from "../assets/landing/icon-google-play.svg";

type Store = "testFlight" | "playStore";

const STORE_CONTENT: Record<
  Store,
  { icon: string; iconSize: number; top: string; bottom: string; label: string }
> = {
  // Temporary (KAN-174): back to the App Store variant once Lila is published there.
  testFlight: {
    icon: appleIcon,
    iconSize: 28,
    top: "Pruébala en iPhone con",
    bottom: "TestFlight",
    label: "Probar Lila en iPhone con TestFlight",
  },
  playStore: {
    icon: googlePlayIcon,
    iconSize: 26,
    top: "Disponible en",
    bottom: "Google Play",
    label: "Descarga Lila en Google Play",
  },
};

/**
 * Store badge (Figma `btn-tienda`, 232x64 pill). Two-layer neon halo in lila.
 * `a` color/weight/hover are forced with `!` because index.css has unlayered `a` rules.
 */
export default function StoreButton({
  store,
  href,
  className,
}: {
  store: Store;
  href: string;
  className?: string;
}) {
  const { icon, iconSize, top, bottom, label } = STORE_CONTENT[store];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        "flex h-16 w-full items-center justify-center gap-3.5 rounded-full border-[1.5px] border-[#9b72c8] bg-brand-dark px-6 text-white! font-normal! shadow-[0_0_18px_rgba(155,114,200,0.55),0_8px_32px_rgba(155,114,200,0.3)] transition-transform hover:-translate-y-0.5 hover:text-white! sm:w-[232px]",
        className,
      )}
    >
      <img
        src={icon}
        alt=""
        width={iconSize}
        height={iconSize}
        className="shrink-0"
      />
      <span className="flex flex-col items-start text-left">
        <span className="font-['Inter'] text-xs leading-4 text-white/85">
          {top}
        </span>
        <span className="font-['Poppins'] text-xl font-semibold leading-[26px] text-white">
          {bottom}
        </span>
      </span>
    </a>
  );
}
