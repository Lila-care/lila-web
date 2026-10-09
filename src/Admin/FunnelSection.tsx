import { DashboardFunnelDto, DashboardStatsDto } from "@/api/dashboard";
import type { UserStage } from "@/api/users";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { FunnelRow } from "@/Admin/ledger/FunnelRow";
import { buildUsersHref } from "@/Admin/usersFilters";

interface FunnelStep {
  key: keyof DashboardFunnelDto;
  label: string;
  // Funnel steps are cumulative ("reached") while stages are exclusive, so each row links to
  // the stage where users of that step currently sit; null = the whole registered cohort.
  stage: UserStage | null;
}

const FUNNEL_STEPS: FunnelStep[] = [
  { key: "registered", label: "Registradas", stage: null },
  { key: "confirmed", label: "Cuenta confirmada", stage: "no_onboarding" },
  {
    key: "onboardingStarted",
    label: "Onboarding iniciado",
    stage: "onboarding_in_progress",
  },
  {
    key: "onboardingCompleted",
    label: "Onboarding completo",
    stage: "onboarding_completed",
  },
  {
    key: "firstCycleReport",
    label: "Primer reporte de ciclo",
    stage: "onboarding_completed",
  },
  {
    key: "firstConversation",
    label: "Primera conversación con Lila",
    stage: "onboarding_completed",
  },
  { key: "activeSubscription", label: "Suscripción activa", stage: "subscribed" },
];

function stepRatio(
  funnel: DashboardFunnelDto,
  index: number,
): number | null {
  if (index === 0) return null;
  const previous = funnel[FUNNEL_STEPS[index - 1].key];
  return previous > 0 ? funnel[FUNNEL_STEPS[index].key] / previous : 0;
}

export default function FunnelSection({ stats }: { stats: DashboardStatsDto }) {
  const { funnel, range } = stats;
  return (
    <section
      aria-labelledby="funnel-section-title"
      data-testid="funnel-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle
        id="funnel-section-title"
        title="Embudo de usuarias"
        caption={`Registradas en ${range.days} días`}
      />
      {funnel.registered === 0 ? (
        <p
          className="type-body-sm py-2 text-text-secondary"
          data-testid="funnel-empty"
        >
          Nadie se registró en los últimos {range.days} días.
        </p>
      ) : (
        <ul>
          {FUNNEL_STEPS.map((step, index) => (
            <FunnelRow
              key={step.key}
              label={step.label}
              count={funnel[step.key]}
              ratio={stepRatio(funnel, index)}
              href={buildUsersHref({
                stage: step.stage ?? "",
                from: range.from,
                to: range.to,
              })}
              testId={`funnel-row-${step.key}`}
            />
          ))}
        </ul>
      )}
      <p className="type-caption text-text-secondary" data-testid="funnel-footnote">
        % sobre el paso anterior. Tocá una fila para ver esas usuarias. Cada fila
        filtra por la etapa en la que está hoy la usuaria, no por haber alcanzado ese
        paso.
      </p>
    </section>
  );
}
