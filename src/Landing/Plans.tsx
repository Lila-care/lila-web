import { cn } from "@lila-care/design-system";
import { PLANS, type PlanCard } from "./landingContent";
import { CheckItem, Eyebrow, OutlineCta, PrimaryCta, SectionContainer } from "./LandingPrimitives";

function PlanCardView({ plan }: { plan: PlanCard }) {
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col items-start gap-5 rounded-3xl bg-white p-8",
        plan.featured
          ? "border-2 border-[color:var(--brand-primary)]"
          : "border border-[color:var(--border-default)]",
        plan.tinted && "bg-[color:var(--surface-brand-light)]",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <h3 className="font-['Poppins'] text-[17px] font-medium leading-6 text-brand-dark">
          {plan.name}
        </h3>
        {plan.badge && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-['DM_Sans'] text-[11px] font-medium leading-4",
              plan.featured
                ? "bg-[color:var(--brand-primary)] text-white"
                : "bg-white text-[color:var(--brand-primary)]",
            )}
          >
            {plan.badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p
          className={cn(
            "font-['Poppins'] font-semibold leading-[1.18] text-brand-dark",
            plan.tinted ? "text-[28px] tracking-[-0.28px]" : "text-[40px] tracking-[-0.4px]",
          )}
        >
          {plan.price}
        </p>
        <p className="text-xs leading-4 text-[color:var(--text-muted)]">{plan.priceNote}</p>
      </div>
      <p className="text-sm leading-5 text-[color:var(--text-secondary)]">{plan.description}</p>
      <hr className="h-px w-full border-0 bg-[color:var(--border-default)]" />
      <ul className="flex w-full flex-col gap-3">
        {plan.features.map((feature) => (
          <CheckItem key={feature}>{feature}</CheckItem>
        ))}
      </ul>
      {plan.id === "free" ? (
        <OutlineCta href="/login" className="mt-auto sm:w-full">
          {plan.cta}
        </OutlineCta>
      ) : (
        <PrimaryCta className="mt-auto sm:w-full">{plan.cta}</PrimaryCta>
      )}
    </li>
  );
}

export default function Plans() {
  return (
    <section id="plans" aria-labelledby="plans-title">
      <SectionContainer className="flex flex-col items-center gap-10 py-16 md:gap-14 md:py-24 xl:py-28">
        <div className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <Eyebrow>PLANES</Eyebrow>
          <h2
            id="plans-title"
            className="font-['Poppins'] text-[32px] font-semibold leading-[1.18] tracking-[-0.3px] text-brand-dark md:text-[44px] md:tracking-[-0.44px]"
          >
            Lo básico siempre es gratis
          </h2>
          <p className="max-w-[640px] text-base leading-6 text-[color:var(--text-secondary)]">
            Registrar tu periodo, tus síntomas y tu diario nunca tiene costo. Premium suma más
            conversación con Lila y todo el contenido de Aprende.
          </p>
        </div>
        <ul className="grid w-full gap-6 lg:grid-cols-3 lg:items-start">
          {PLANS.map((plan) => (
            <PlanCardView key={plan.id} plan={plan} />
          ))}
        </ul>
        <p className="text-center text-xs leading-4 text-[color:var(--text-muted)]">
          Precios en pesos colombianos. Los pagos se procesan con Wompi.
        </p>
      </SectionContainer>
    </section>
  );
}
