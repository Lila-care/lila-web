import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Skeleton } from "@lila-care/design-system";
import { DashboardUserDetailDto, TimelineMilestoneDto } from "@/api/users";
import { useUserDetail } from "@/Admin/useUsers";
import {
  formatCount,
  formatCurrency,
  formatShortDate,
  formatShortDateTime,
} from "@/Admin/dashboardFormat";
import {
  ACCOUNT_STATUS_LABELS,
  describeMilestone,
  describeTiers,
  describeStage,
  EMAIL_TYPO_HINT,
  hasPendingOnboarding,
  isStoppedHighlight,
  looksLikeEmailTypo,
  PROVIDER_LABELS,
  STAGE_MARKERS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/Admin/usersFormat";
import { StageMarker } from "@/Admin/ledger/StageMarker";
import {
  TimelineItem,
  type TimelineItemState,
} from "@/Admin/ledger/TimelineItem";
import { LedgerError } from "@/Admin/ledger/LedgerError";

interface UserDetailPanelProps {
  userId: string;
  onClose: () => void;
}

const PRIVACY_NOTE =
  "Este panel solo muestra etapas, fechas y conteos. No incluye el contenido de las conversaciones ni las respuestas del formulario.";

function milestoneState(
  milestone: TimelineMilestoneDto,
  user: DashboardUserDetailDto,
): TimelineItemState {
  if (milestone.reachedAt) return "done";
  return isStoppedHighlight(milestone.key, user.stoppedAt) ? "stopped" : "pending";
}

function Timeline({ user }: { user: DashboardUserDetailDto }) {
  return (
    <section aria-labelledby="user-panel-journey" className="flex flex-col gap-2">
      <h3 id="user-panel-journey" className="type-body-md-strong text-text-primary">
        Recorrido
      </h3>
      <ol data-testid="user-panel-timeline">
        {user.timeline.map((milestone, index) => (
          <TimelineItem
            key={milestone.key}
            testId={`timeline-${milestone.key}`}
            title={describeMilestone(milestone.key, milestone.detail)}
            state={milestoneState(milestone, user)}
            date={
              milestone.reachedAt
                ? formatShortDateTime(milestone.reachedAt)
                : undefined
            }
            isLast={index === user.timeline.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

function SummaryRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div
      className="flex min-h-10 items-center justify-between gap-4 border-b border-border-default py-2"
      data-testid={testId}
    >
      <dt className="type-body-md text-text-secondary">{label}</dt>
      <dd className="type-body-md min-w-0 break-words text-right text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function describeLastPayment(summary: DashboardUserDetailDto["summary"]): string {
  if (!summary.lastPayment) return "—";
  const { amountInCents, paidAt } = summary.lastPayment;
  return `${formatCurrency(amountInCents)} · ${formatShortDate(paidAt)}`;
}

function Summary({ user }: { user: DashboardUserDetailDto }) {
  const { summary } = user;
  return (
    <section aria-labelledby="user-panel-summary" className="flex flex-col gap-1">
      <h3 id="user-panel-summary" className="type-body-md-strong text-text-primary">
        Resumen
      </h3>
      <dl data-testid="user-panel-summary">
        <SummaryRow label="Conversaciones" value={formatCount(summary.conversations)} testId="summary-conversations" />
        <SummaryRow label="Reportes de ciclo" value={formatCount(summary.cycleReports)} testId="summary-cycle-reports" />
        <SummaryRow label="Plan" value={summary.plan?.name ?? "Sin plan"} testId="summary-plan" />
        <SummaryRow label="Suscripción" value={SUBSCRIPTION_STATUS_LABELS[summary.subscriptionStatus]} testId="summary-subscription" />
        <SummaryRow label="Último pago" value={describeLastPayment(summary)} testId="summary-last-payment" />
      </dl>
    </section>
  );
}

function Identity({ user }: { user: DashboardUserDetailDto }) {
  const accountNote =
    user.accountStatus === "confirmed" ? null : ACCOUNT_STATUS_LABELS[user.accountStatus];
  return (
    <div className="flex flex-col gap-2" data-testid="user-panel-identity">
      <p className="type-h3 break-words text-text-primary" data-testid="user-panel-name">
        {user.preferredName ?? user.email ?? "Sin email"}
      </p>
      {user.preferredName && user.email && (
        <p className="type-body-md break-words text-text-secondary">{user.email}</p>
      )}
      <p className="type-body-md flex items-center gap-2 text-text-primary" data-testid="user-panel-stage">
        <StageMarker variant={STAGE_MARKERS[user.stage]} />
        <span className="min-w-0">{describeStage(user)}</span>
      </p>
      <p className="type-body-sm text-text-secondary" data-testid="user-panel-meta">
        Ingresó con {PROVIDER_LABELS[user.provider]} · {describeTiers(user.tiers)}
        {accountNote && ` · ${accountNote}`}
      </p>
      {looksLikeEmailTypo(user) && (
        <p className="type-body-sm text-text-secondary" data-testid="user-panel-typo">
          Email sin confirmar · {EMAIL_TYPO_HINT}
        </p>
      )}
      {hasPendingOnboarding(user.stage) && (
        <p className="type-body-sm text-text-secondary" data-testid="user-panel-onboarding-note">
          Todavía no completó el onboarding
        </p>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true" data-testid="user-panel-loading">
      <Skeleton className="h-6 w-3/4 rounded-xs bg-surface-brand-light" />
      <Skeleton className="h-4 w-1/2 rounded-xs bg-surface-brand-light" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-xs bg-surface-brand-light" />
      ))}
    </div>
  );
}

// Figma UserDetailPanel (890:2774 / 894:4235): 440px sheet on the right from lg, the whole
// screen below (768 has no design: approved fallback). Figma has no scrim: the list stays
// visible and interactive with the open row highlighted, so the Dialog is non-modal
// (`modal={false}`: no overlay, no focus trap, no scroll lock, no aria-modal/inert page).
// Escape and "Cerrar" close it; clicking outside does NOT (a click on another row just swaps
// the user). Focus starts on "Cerrar" and returns to the element that opened it.
export function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const { user, loading, error, notFound, refetch } = useUserDetail(userId);
  // Captured on first render, before radix moves focus into the dialog.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  return (
    <Dialog.Root open modal={false} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener?.isConnected) opener.focus();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-6 overflow-y-auto border-l border-border-default bg-card p-6 focus:outline-none lg:w-110"
          data-testid="user-panel"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="type-caption-medium text-text-secondary">
              Detalle de usuaria
            </Dialog.Title>
            <Dialog.Close
              className="type-body-md -m-1 flex items-center gap-1 rounded-xs p-1 text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-teal-700"
              data-testid="user-panel-close"
            >
              Cerrar
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {loading && <PanelSkeleton />}

          {!loading && error && (
            <LedgerError
              message={error}
              onRetry={refetch}
              testId="user-panel-error"
            />
          )}

          {!loading && notFound && (
            <p className="type-body-md text-text-secondary" data-testid="user-panel-not-found">
              No encontramos a esta usuaria.
            </p>
          )}

          {!loading && user && (
            <>
              <Identity user={user} />
              <Timeline user={user} />
              <Summary user={user} />
              <p className="type-caption border-t border-border-default pt-4 text-text-secondary" data-testid="user-panel-privacy">
                {PRIVACY_NOTE}
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
