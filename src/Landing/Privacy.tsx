import mockupPrivacy from "../assets/landing/mockup-privacy.png";
import { PRIVACY_POINTS } from "./landingContent";
import { CheckItem, Eyebrow, PhoneVisual, SectionContainer } from "./LandingPrimitives";

export default function Privacy() {
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="bg-[color:var(--brand-primary-dark)]"
    >
      <SectionContainer className="flex flex-col items-center justify-center gap-10 py-16 md:flex-row md:gap-12 md:py-24 xl:gap-24 xl:py-28">
        <div className="flex w-full min-w-0 flex-col items-start gap-5 md:max-w-[520px] md:flex-1">
          <Eyebrow className="text-[#b793c6]">PRIVACIDAD</Eyebrow>
          <h2
            id="privacy-title"
            className="font-['Poppins'] text-[32px] font-semibold leading-[1.18] tracking-[-0.3px] text-white md:text-[44px] md:tracking-[-0.44px]"
          >
            Tus datos son tuyos
          </h2>
          <p className="text-base leading-6 text-white">
            Lila nació como respuesta a las apps que comercializan los datos de sus usuarias.
            Aquí tu información de salud no se vende ni se comparte con nadie.
          </p>
          <ul className="flex flex-col gap-3">
            {PRIVACY_POINTS.map((point) => (
              <CheckItem key={point} tone="light">
                {point}
              </CheckItem>
            ))}
          </ul>
        </div>
        <div className="flex w-full justify-center md:w-[44%] md:max-w-[440px] md:flex-none">
          <PhoneVisual
            src={mockupPrivacy}
            alt="Pantalla de Privacidad en el perfil de Lila"
            haloColor="rgba(183,147,198,0.4)"
          />
        </div>
      </SectionContainer>
    </section>
  );
}
