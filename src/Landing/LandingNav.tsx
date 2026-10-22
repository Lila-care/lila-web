import { Link } from "wouter";
import sealLila from "../assets/landing/seal-lila.svg";
import { NAV_LINKS } from "./landingContent";
import { PrimaryCta, SectionContainer } from "./LandingPrimitives";

export default function LandingNav() {
  return (
    <header>
      <SectionContainer className="flex items-center justify-between gap-4 py-4 md:py-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-brand-dark hover:text-brand-dark!">
          <img src={sealLila} alt="" width={29} height={36} className="shrink-0" />
          <span className="font-['Poppins'] text-xl font-semibold leading-7">
            Lila Care
          </span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[13px] font-medium leading-[18px] text-[color:var(--text-secondary)] hover:text-brand-primary!"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <PrimaryCta className="h-10 w-auto px-4 text-sm md:h-12 md:px-6 md:text-base">
            Quiero probar Lila
          </PrimaryCta>
        </nav>
      </SectionContainer>
    </header>
  );
}
