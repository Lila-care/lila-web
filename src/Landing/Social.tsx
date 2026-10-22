import cycleRing from "../assets/landing/cycle-ring.svg";
import { SOCIAL_ACCOUNTS } from "./landingContent";
import { PhaseDot, PrimaryCta, SectionContainer } from "./LandingPrimitives";

export default function Social() {
  return (
    <section id="social" aria-labelledby="social-title" className="bg-white">
      <SectionContainer className="flex flex-col items-center gap-8 pb-20 pt-16 text-center md:pb-28 md:pt-24">
        <img src={cycleRing} alt="" width={144} height={144} />
        <h2
          id="social-title"
          className="font-['Poppins'] text-[32px] font-semibold leading-[1.18] tracking-[-0.3px] text-brand-dark md:text-[44px] md:tracking-[-0.44px]"
        >
          Sigue a Lila
        </h2>
        <p className="max-w-[560px] text-base leading-6 text-[color:var(--text-secondary)]">
          Contenido sobre tu ciclo, novedades de la app y la comunidad detrás de Lila.
        </p>
        <ul className="flex flex-wrap items-start justify-center gap-4">
          {SOCIAL_ACCOUNTS.map((account) => (
            <li key={account.network}>
              <a
                href={account.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 rounded-full border border-[color:var(--border-default)] bg-[#faf6f0] px-6 py-[18px] hover:opacity-90"
              >
                <PhaseDot phase={account.phase} />
                <span className="flex flex-col items-start text-left">
                  <span className="text-xs font-normal leading-4 text-[color:var(--text-muted)]">
                    {account.network}
                  </span>
                  <span className="font-['DM_Sans'] text-base font-semibold leading-6 text-brand-dark">
                    {account.handle}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <PrimaryCta>Quiero probar Lila</PrimaryCta>
      </SectionContainer>
    </section>
  );
}
