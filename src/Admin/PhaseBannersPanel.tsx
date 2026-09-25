import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  BANNER_PHASES,
  reviewPhaseBanner,
  transitionPhaseBanner,
  updatePhaseBanner,
  type PhaseBanner,
  type PhaseName,
  type ReviewDecision,
} from "@/api/learn";
import { usePhaseBanners } from "@/Admin/usePhaseBanners";
import { useContentMutation } from "@/Admin/useContentMutation";
import { getContentActions } from "@/Admin/contentPermissions";
import { phaseLabel } from "@/Admin/contentLabels";
import { ContentStatusBadge } from "@/Admin/ContentStatusBadge";
import { ReviewDecisionPanel } from "@/Admin/ReviewDecisionPanel";
import { ReloadableMutationError } from "@/Admin/ReloadableMutationError";
import { ReviewNotesNotice } from "@/Admin/ReviewNotesNotice";
import { ContentError, ContentLoading } from "@/Admin/ContentStateViews";
import {
  CARD,
  INPUT,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SUCCESS_BUTTON,
} from "@/Admin/contentUi";

export function PhaseBannersPanel() {
  const { banners, loading, error, refetch, replaceBanner } = usePhaseBanners();

  if (loading) {
    return (
      <ContentLoading label="Cargando banners..." testId="banners-loading" />
    );
  }
  if (error) {
    return (
      <ContentError message={error} onRetry={refetch} testId="banners-error" />
    );
  }

  // The API only returns banners that were saved at least once; the 4 phases are always shown
  // so a missing one can be written from here.
  return (
    <section className="grid gap-4 lg:grid-cols-2" data-testid="banners-panel">
      {BANNER_PHASES.map((phase) => {
        const banner = banners.find((item) => item.phase === phase) ?? null;
        return (
          <PhaseBannerCard
            key={`${phase}-${banner?.updatedAt ?? "new"}`}
            phase={phase}
            banner={banner}
            onChanged={replaceBanner}
            onReload={refetch}
          />
        );
      })}
    </section>
  );
}

interface PhaseBannerCardProps {
  phase: PhaseName;
  banner: PhaseBanner | null;
  onChanged: (banner: PhaseBanner) => void;
  onReload: () => void;
}

function PhaseBannerCard({
  phase,
  banner,
  onChanged,
  onReload,
}: PhaseBannerCardProps) {
  const { token, roles } = useAuth();
  const { pending, error, run } = useContentMutation();
  const [text, setText] = useState(banner?.text ?? "");
  const actions = getContentActions(
    banner ?? { version: 0, status: "DRAFT" },
    roles,
  );
  const isDirty = text !== (banner?.text ?? "");
  const testIdPrefix = `banner-${phase}`;

  const mutate = async (
    action: string,
    task: (authToken: string) => Promise<PhaseBanner>,
  ): Promise<boolean> => {
    if (!token) return false;
    const updated = await run(action, () => task(token));
    if (updated) onChanged(updated);
    return updated !== null;
  };

  const review = (decision: ReviewDecision, notes: string) =>
    mutate(decision, (authToken) =>
      reviewPhaseBanner(authToken, phase, {
        decision,
        notes: notes || undefined,
      }),
    );

  const showPublishedCopy =
    banner?.published && banner.published.version !== banner.version;

  return (
    <article className={`${CARD} space-y-3`} data-testid={testIdPrefix}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-semibold text-gray-900">
          {phaseLabel(phase)}
        </h3>
        {banner ? (
          <>
            <ContentStatusBadge status={banner.status} />
            <span className="text-xs text-gray-500">v{banner.version}</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">Sin banner</span>
        )}
      </header>

      {banner?.status === "CHANGES_REQUESTED" && banner.review?.notes && (
        <ReviewNotesNotice notes={banner.review.notes} />
      )}

      {actions.canEdit ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          rows={3}
          disabled={pending !== null}
          aria-label={`Texto del banner de ${phaseLabel(phase)}`}
          className={INPUT}
          placeholder="Texto corto que la usuaria ve en Hoy durante esta fase."
          data-testid={`${testIdPrefix}-text`}
        />
      ) : (
        <p
          className="whitespace-pre-line text-sm text-gray-800"
          data-testid={`${testIdPrefix}-text`}
        >
          {banner?.text || (
            <span className="text-gray-400">Todavía no hay texto.</span>
          )}
        </p>
      )}

      {showPublishedCopy && banner?.published && (
        <p className="rounded-[8px] bg-gray-50 p-2 text-xs text-gray-600">
          En la app (v{banner.published.version}): {banner.published.text}
        </p>
      )}

      {error && <ReloadableMutationError error={error} onReload={onReload} />}

      {actions.canEdit && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              mutate("save", (authToken) =>
                updatePhaseBanner(authToken, phase, text.trim()),
              )
            }
            disabled={!isDirty || !text.trim() || pending !== null}
            className={SECONDARY_BUTTON}
            data-testid={`${testIdPrefix}-save`}
          >
            {pending === "save" && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </button>
          {banner && actions.canSubmit && (
            <button
              type="button"
              onClick={() =>
                mutate("submit", (authToken) =>
                  transitionPhaseBanner(authToken, phase, "submit"),
                )
              }
              disabled={isDirty || pending !== null}
              title={isDirty ? "Guarda los cambios antes de enviar" : undefined}
              className={PRIMARY_BUTTON}
              data-testid={`${testIdPrefix}-submit`}
            >
              {pending === "submit" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Enviar a revisión
            </button>
          )}
          {actions.canPublish && (
            <button
              type="button"
              onClick={() =>
                mutate("publish", (authToken) =>
                  transitionPhaseBanner(authToken, phase, "publish"),
                )
              }
              disabled={isDirty || pending !== null}
              className={SUCCESS_BUTTON}
              data-testid={`${testIdPrefix}-publish`}
            >
              {pending === "publish" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Publicar
            </button>
          )}
        </div>
      )}

      {actions.canReview && (
        <ReviewDecisionPanel
          onDecide={review}
          pendingDecision={
            pending === "approve" || pending === "request_changes"
              ? pending
              : null
          }
          testIdPrefix={testIdPrefix}
        />
      )}
    </article>
  );
}
