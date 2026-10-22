import { PILLARS } from "./landingContent";
import { PhaseDot, SectionContainer } from "./LandingPrimitives";

export default function Pillars() {
  return (
    <section aria-label="Qué hace Lila">
      <SectionContainer className="pb-16 md:pb-20 xl:pb-24">
        <ul className="grid gap-4 md:grid-cols-3 md:items-start md:gap-6">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.title}
              className="flex min-w-0 flex-col items-start gap-3 rounded-[20px] border border-[color:var(--border-default)] bg-white p-7"
            >
              <PhaseDot phase={pillar.phase} />
              <h2 className="font-['Poppins'] text-xl font-semibold leading-7 text-brand-dark">
                {pillar.title}
              </h2>
              <p className="text-sm leading-5 text-[color:var(--text-secondary)]">
                {pillar.text}
              </p>
            </li>
          ))}
        </ul>
      </SectionContainer>
    </section>
  );
}
