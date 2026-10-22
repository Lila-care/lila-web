import { cn } from "@lila-care/design-system";
import { FEATURES, PHASE_COLORS, type FeatureRow } from "./landingContent";
import { CheckItem, Eyebrow, PhaseDot, PhoneVisual, SectionContainer } from "./LandingPrimitives";

function FeatureBlock({ feature, reversed }: { feature: FeatureRow; reversed: boolean }) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 md:flex-row md:gap-12 xl:gap-24",
        reversed && "md:flex-row-reverse",
      )}
    >
      <div className="flex w-full min-w-0 flex-col items-start gap-5 md:max-w-[480px] md:flex-1">
        <div className="flex items-center gap-2">
          <PhaseDot phase={feature.phase} size={10} />
          <Eyebrow>{feature.eyebrow}</Eyebrow>
        </div>
        <h3 className="font-['Poppins'] text-[28px] font-semibold leading-[1.18] tracking-[-0.28px] text-brand-dark md:text-[32px] xl:text-[36px] xl:tracking-[-0.36px]">
          {feature.title}
        </h3>
        <p className="text-base leading-6 text-[color:var(--text-secondary)]">
          {feature.description}
        </p>
        <ul className="flex flex-col gap-2.5">
          {feature.points.map((point) => (
            <CheckItem key={point}>{point}</CheckItem>
          ))}
        </ul>
      </div>
      <div className="flex w-full justify-center md:w-[44%] md:max-w-[440px] md:flex-none">
        <PhoneVisual
          src={feature.image}
          alt={feature.imageAlt}
          haloColor={`${PHASE_COLORS[feature.phase]}88`}
        />
      </div>
    </article>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="bg-white">
      <SectionContainer className="flex flex-col items-center gap-12 py-16 md:gap-[72px] md:py-24 xl:py-28">
        <div className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Eyebrow>CÓMO FUNCIONA</Eyebrow>
          <h2
            id="how-title"
            className="font-['Poppins'] text-[32px] font-semibold leading-[1.18] tracking-[-0.3px] text-brand-dark md:text-[44px] md:tracking-[-0.44px]"
          >
            Todo lo de tu ciclo, en un solo lugar
          </h2>
          <p className="max-w-[640px] text-base leading-6 text-[color:var(--text-secondary)]">
            Lila junta tus registros, tu calendario y tus dudas para que entiendas lo que pasa en
            tu cuerpo mes a mes.
          </p>
        </div>
        {FEATURES.map((feature, index) => (
          <FeatureBlock key={feature.id} feature={feature} reversed={index % 2 === 1} />
        ))}
      </SectionContainer>
    </section>
  );
}
