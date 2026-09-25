import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Sparkles } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useAuth } from "@/auth/AuthContext";
import { REVIEW_STATUSES, type ReviewStatus } from "@/api/learn";
import { hasAdminRole, isMedicalReviewerOnly } from "@/lib/adminRoles";
import { cn } from "@/lib/utils";
import { useLearnArticles } from "@/Admin/useLearnArticles";
import { ContentArticlesTable } from "@/Admin/ContentArticlesTable";
import { GenerateDraftForm, NewArticleForm } from "@/Admin/ContentCreateForms";
import { PhaseBannersPanel } from "@/Admin/PhaseBannersPanel";
import {
  ContentEmpty,
  ContentError,
  ContentLoading,
} from "@/Admin/ContentStateViews";
import { REVIEW_STATUS_LABEL } from "@/Admin/contentLabels";
import { INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/Admin/contentUi";

type ContentTab = "articles" | "banners";
type CreateMode = "manual" | "ai" | null;

const TABS: { id: ContentTab; label: string }[] = [
  { id: "articles", label: "Artículos" },
  { id: "banners", label: "Banners de fase" },
];

function ContentPage() {
  const [tab, setTab] = useState<ContentTab>("articles");

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-white px-4 py-6 md:p-10"
        data-testid="content-page"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Contenido</h1>
          <p className="mt-1 text-sm text-gray-500">
            Artículos y banners de la sección Aprende. Todo pasa por revisión
            médica antes de verse en la app.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Tipo de contenido"
          className="mb-6 flex gap-6 border-b border-gray-200"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm",
                tab === id
                  ? "border-primary font-semibold text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
              data-testid={`content-tab-${id}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "articles" ? <ArticlesSection /> : <PhaseBannersPanel />}
      </div>
    </AdminLayout>
  );
}

function ArticlesSection() {
  const { roles } = useAuth();
  const [, navigate] = useLocation();
  const reviewerOnly = isMedicalReviewerOnly(roles);
  const canCreate = hasAdminRole(roles);
  // A reviewer opens the section to see what's waiting for her.
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | null>(
    reviewerOnly ? "IN_REVIEW" : null,
  );
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const { articles, loading, error, refetch } = useLearnArticles(statusFilter);

  const openArticle = (articleId: string) =>
    navigate(`/admin/content/${articleId}`);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:w-64">
          <label
            htmlFor="content-status-filter"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Estado
          </label>
          <select
            id="content-status-filter"
            value={statusFilter ?? ""}
            onChange={(event) =>
              setStatusFilter(
                (event.target.value || null) as ReviewStatus | null,
              )
            }
            className={INPUT}
            data-testid="content-status-filter"
          >
            <option value="">Todos</option>
            {REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "IN_REVIEW"
                  ? "Pendientes de revisión"
                  : REVIEW_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
        {canCreate && createMode === null && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCreateMode("manual")}
              className={SECONDARY_BUTTON}
              data-testid="content-new-article"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuevo artículo
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("ai")}
              className={PRIMARY_BUTTON}
              data-testid="content-generate-draft"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Generar borrador con IA
            </button>
          </div>
        )}
      </div>

      {createMode === "manual" && (
        <NewArticleForm
          onCreated={(article) => openArticle(article.articleId)}
          onCancel={() => setCreateMode(null)}
        />
      )}
      {createMode === "ai" && (
        <GenerateDraftForm
          onCreated={(article) => openArticle(article.articleId)}
          onCancel={() => setCreateMode(null)}
        />
      )}

      <ArticlesList
        loading={loading}
        error={error}
        onRetry={refetch}
        isEmpty={articles.length === 0}
        emptyTitle={emptyTitle(statusFilter)}
        emptyHint={
          canCreate && statusFilter === null
            ? "Crea uno a mano o genera un borrador con IA."
            : undefined
        }
      >
        <ContentArticlesTable data={articles} onSelectArticle={openArticle} />
      </ArticlesList>
    </section>
  );
}

function emptyTitle(statusFilter: ReviewStatus | null): string {
  if (statusFilter === "IN_REVIEW") {
    return "No hay artículos pendientes de revisión.";
  }
  if (statusFilter) {
    return `No hay artículos en estado "${REVIEW_STATUS_LABEL[statusFilter]}".`;
  }
  return "Todavía no hay artículos.";
}

interface ArticlesListProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint?: string;
  children: ReactNode;
}

function ArticlesList({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyHint,
  children,
}: ArticlesListProps) {
  if (loading) {
    return (
      <ContentLoading label="Cargando artículos..." testId="content-loading" />
    );
  }
  if (error) {
    return (
      <ContentError message={error} onRetry={onRetry} testId="content-error" />
    );
  }
  if (isEmpty) {
    return (
      <ContentEmpty title={emptyTitle} testId="content-empty">
        {emptyHint}
      </ContentEmpty>
    );
  }
  return <>{children}</>;
}

export default ContentPage;
