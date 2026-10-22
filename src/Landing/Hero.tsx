import mockupToday from "../assets/landing/mockup-hero-today.png";
import mockupCalendar from "../assets/landing/mockup-hero-calendar.png";
import { AVAILABILITY_COPY, type Phase } from "./landingContent";
import {
  OutlineCta,
  PhaseDot,
  PrimaryCta,
  SectionContainer,
} from "./LandingPrimitives";

const LAUNCH_PHASES: Phase[] = ["menstruation", "follicular", "ovulation", "luteal"];

const HALOS = [
  { box: "left-[6.5%] top-[6.3%] w-[58%] aspect-square", color: "rgba(155,114,200,0.5)" },
  { box: "left-[51.6%] top-[53.1%] w-[45.2%] aspect-square", color: "rgba(181,194,106,0.4)" },
  { box: "left-[53.2%] top-0 w-[48.4%] aspect-square", color: "rgba(240,196,168,0.55)" },
];

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[620/640] w-full max-w-[620px] shrink-0 lg:mx-0">
      {HALOS.map((halo) => (
        <div
          key={halo.box}
          aria-hidden="true"
          className={`absolute rounded-full blur-3xl ${halo.box}`}
          style={{ background: `radial-gradient(circle, ${halo.color} 0%, transparent 70%)` }}
        />
      ))}
      <img
        src={mockupCalendar}
        alt="Calendario de Lila con las fases del mes"
        className="absolute left-[-3.5%] top-[7.2%] h-auto w-[58.2%] max-w-none"
      />
      <img
        src={mockupToday}
        alt="Pantalla Hoy de Lila con la fase actual del ciclo"
        className="absolute left-[40.5%] top-[-3.5%] h-auto w-[59.8%] max-w-none"
      />
    </div>
  );
}

export default function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <SectionContainer className="flex flex-col items-center gap-10 pb-16 pt-6 md:pb-20 md:pt-10 lg:flex-row lg:gap-12 xl:pb-24 xl:pr-20">
        <div className="flex min-w-0 flex-col items-start gap-6 lg:w-[600px] lg:shrink-0">
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-full bg-[color:var(--surface-brand-light)] px-3.5 py-1.5">
            {LAUNCH_PHASES.map((phase) => (
              <PhaseDot key={phase} phase={phase} size={8} />
            ))}
            <span className="font-['DM_Sans'] text-[11px] font-medium leading-4 text-[color:var(--brand-primary)]">
              Lanzamiento · 31 de octubre
            </span>
          </div>
          <h1
            id="hero-title"
            className="font-['Poppins'] text-[40px] font-semibold leading-[1.18] tracking-[-0.6px] text-brand-dark md:text-[52px] xl:text-[60px] xl:tracking-[-0.9px]"
          >
            Tu ciclo tiene mucho que contarte
          </h1>
          <p className="max-w-[520px] text-base leading-6 text-[color:var(--text-secondary)]">
            Registra tu periodo, entiende cada fase y resuelve tus dudas con información de
            fuentes científicas. Todo en una app que no vende ni comparte tus datos.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <PrimaryCta>Quiero probar Lila</PrimaryCta>
            <OutlineCta href="#plans" local={false}>
              Ver planes
            </OutlineCta>
          </div>
          <p className="text-xs leading-4 text-[color:var(--text-muted)]">
            {AVAILABILITY_COPY} · Hecha en Medellín
          </p>
        </div>
        <HeroVisual />
      </SectionContainer>
    </section>
  );
}
