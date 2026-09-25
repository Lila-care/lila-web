import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useAuth } from "@/auth/AuthContext";
import {
  reviewArticle,
  transitionArticle,
  updateArticle,
  type LearnArticle,
  type ReviewDecision,
} from "@/api/learn";
import { useLearnArticle } from "@/Admin/useLearnArticle";
import { useContentMutation } from "@/Admin/useContentMutation";
import { getContentActions } from "@/Admin/contentPermissions";
import {
  buildArticlePatch,
  draftFromArticle,
  isDraftDirty,
  validateArticleDraft,
  type ArticleDraft,
} from "@/Admin/articleDraft";
import { formatDateTime } from "@/Admin/contentLabels";
import { ContentStatusBadge } from "@/Admin/ContentStatusBadge";
import {
  ContentEmpty,
  ContentError,
  ContentLoading,
} from "@/Admin/ContentStateViews";
import { ArticleNotices } from "@/Admin/ArticleNotices";
import { ArticleEditorForm } from "@/Admin/ArticleEditorForm";
import {
  ArticlePreview,
  type ArticlePreviewContent,
} from "@/Admin/ArticlePreview";
import { ArticleVersionComparison } from "@/Admin/ArticleVersionComparison";
import { ArticleWorkflowBar } from "@/Admin/ArticleWorkflowBar";
import { ReviewDecisionPanel } from "@/Admin/ReviewDecisionPanel";
import { ReloadableMutationError } from "@/Admin/ReloadableMutationError";
import { cn } from "@/lib/utils";

export type ArticleViewMode = "edit" | "preview";

function ArticleDetailPage() {
  const [, params] = useRoute<{ id: string }>("/admin/content/:id");
  const articleId = params?.id ?? "";
  const { article, revision, loading, error, reload, replaceArticle } =
    useLearnArticle(articleId);
  // Lives here (not in the workspace) so it survives the remount after every save.
  const [mode, setMode] = useState<ArticleViewMode | null>(null);

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-white px-4 py-6 md:p-10"
        data-testid="article-detail-page"
      >
        <Link
          href="/admin/content"
          className="mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4 text-gray-500" aria-hidden="true" />
          <span className="text-gray-600">Contenido</span>
        </Link>
        {article && error && (
          // A failed reload keeps the last loaded version on screen, but says so.
          <div className="mb-4">
            <ContentError message={error} onRetry={reload} testId="article-error" />
          </div>
        )}
        {article ? (
          <ArticleWorkspace
            // Every entity received (save, review, reload…) resets the local draft to it —
            // also when a reload returns the very same entity ("Recargar" discards edits).
            key={`${article.articleId}-${revision}`}
            article={article}
            mode={mode}
            onModeChange={setMode}
            onArticleChange={replaceArticle}
            onReload={reload}
          />
        ) : loading ? (
          <ContentLoading
            label="Cargando artículo..."
            testId="article-loading"
          />
        ) : error ? (
          <ContentError
            message={error}
            onRetry={reload}
            testId="article-error"
          />
        ) : (
          <ContentEmpty
            title="Este artículo no existe."
            testId="article-empty"
          />
        )}
      </div>
    </AdminLayout>
  );
}

interface ArticleWorkspaceProps {
  article: LearnArticle;
  mode: ArticleViewMode | null;
  onModeChange: (mode: ArticleViewMode) => void;
  onArticleChange: (article: LearnArticle) => void;
  onReload: () => void;
}

function useWarnOnUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

function ArticleWorkspace({
  article,
  mode,
  onModeChange,
  onArticleChange,
  onReload,
}: ArticleWorkspaceProps) {
  const { token, roles } = useAuth();
  const { pending, error, run } = useContentMutation();
  const [draft, setDraft] = useState<ArticleDraft>(() =>
    draftFromArticle(article),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const actions = getContentActions(article, roles);
  const isDirty = actions.canEdit && isDraftDirty(article, draft);
  useWarnOnUnload(isDirty);

  // Reviewers (without admin) only get the read view; a user with both roles starts on the
  // read view while the article waits for her review.
  const activeMode: ArticleViewMode = !actions.canEdit
    ? "preview"
    : (mode ?? (actions.canReview ? "preview" : "edit"));

  const mutate = async (
    action: string,
    task: (authToken: string) => Promise<LearnArticle>,
  ): Promise<boolean> => {
    if (!token) return false;
    const updated = await run(action, () => task(token));
    if (updated) onArticleChange(updated);
    return updated !== null;
  };

  const save = () => {
    const problem = validateArticleDraft(draft);
    setValidationError(problem);
    if (problem) return;
    mutate("save", (authToken) =>
      updateArticle(
        authToken,
        article.articleId,
        buildArticlePatch(article, draft),
      ),
    );
  };

  const review = (decision: ReviewDecision, notes: string) =>
    mutate(decision, (authToken) =>
      reviewArticle(authToken, article.articleId, {
        decision,
        notes: notes || undefined,
      }),
    );

  // Admins preview what they're typing; reviewers always see the saved version.
  const previewContent: ArticlePreviewContent & { version: number } = {
    ...article,
    ...(actions.canEdit ? draft : {}),
  };

  return (
    <div className="space-y-5" data-testid="article-workspace">
      <ArticleHeader article={article} />

      <ArticleNotices article={article} />

      {actions.canEdit && (
        <ArticleWorkflowBar
          article={article}
          actions={actions}
          mode={activeMode}
          isDirty={isDirty}
          pending={pending}
          onSave={save}
          onTransition={(transition) =>
            mutate(transition, (authToken) =>
              transitionArticle(authToken, article.articleId, transition),
            )
          }
        />
      )}

      {validationError && (
        <p
          className="text-sm text-red-600"
          data-testid="article-validation-error"
        >
          {validationError}
        </p>
      )}
      {error && <ReloadableMutationError error={error} onReload={onReload} />}

      {actions.canEdit && (
        <ModeToggle mode={activeMode} onChange={onModeChange} />
      )}

      {activeMode === "edit" ? (
        <ArticleEditorForm
          article={article}
          draft={draft}
          onChange={(changes) =>
            setDraft((current) => ({ ...current, ...changes }))
          }
          disabled={pending !== null}
        />
      ) : (
        <div className="mx-auto max-w-5xl space-y-5">
          {isDirty && (
            <p className="text-sm text-amber-700">
              Vista previa con cambios sin guardar.
            </p>
          )}
          {article.published &&
          article.published.version !== article.version ? (
            <ArticleVersionComparison
              proposed={previewContent}
              published={article.published}
            />
          ) : (
            <ArticlePreview content={previewContent} />
          )}
          {actions.canReview && !isDirty && (
            <ReviewDecisionPanel
              onDecide={review}
              pendingDecision={
                pending === "approve" || pending === "request_changes"
                  ? pending
                  : null
              }
              testIdPrefix="article"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ArticleHeader({ article }: { article: LearnArticle }) {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1
          className="min-w-0 break-words text-xl font-semibold text-gray-900 md:text-2xl"
          data-testid="article-heading"
        >
          {article.title || "Sin título"}
        </h1>
        <ContentStatusBadge status={article.status} />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
        <span data-testid="article-version">v{article.version}</span>
        {article.published && (
          <span data-testid="article-published-version">
            Publicada v{article.published.version}
          </span>
        )}
        {article.origin === "ai_draft" && <span>Borrador generado con IA</span>}
        <span>Actualizado {formatDateTime(article.updatedAt)}</span>
      </p>
    </header>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ArticleViewMode;
  onChange: (mode: ArticleViewMode) => void;
}) {
  const options: { id: ArticleViewMode; label: string }[] = [
    { id: "edit", label: "Editar" },
    { id: "preview", label: "Vista previa" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo"
      className="inline-flex gap-1 rounded-[10px] bg-gray-100 p-1"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={mode === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-sm",
            mode === option.id
              ? "bg-white font-semibold text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
          data-testid={`article-mode-${option.id}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ArticleDetailPage;
