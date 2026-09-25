import { Lock } from "lucide-react";
import type { LearnArticle } from "@/api/learn";
import type { ArticleDraft } from "@/Admin/articleDraft";
import { ArticleSourcesEditor } from "@/Admin/ArticleSourcesEditor";
import { ContentBlocksEditor } from "@/Admin/ContentBlocksEditor";
import { PhaseSelect } from "@/Admin/PhaseSelect";
import { CARD, INPUT, LABEL } from "@/Admin/contentUi";

interface ArticleEditorFormProps {
  article: LearnArticle;
  draft: ArticleDraft;
  onChange: (changes: Partial<ArticleDraft>) => void;
  disabled: boolean;
}

export function ArticleEditorForm({
  article,
  draft,
  onChange,
  disabled,
}: ArticleEditorFormProps) {
  // The slug is the article's public URL in the app once it has ever been published.
  const slugLocked = Boolean(article.published);

  return (
    <div className="space-y-6" data-testid="article-editor">
      <section className={`${CARD} space-y-4`}>
        <div>
          <label htmlFor="article-title" className={LABEL}>
            Título
          </label>
          <input
            id="article-title"
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            disabled={disabled}
            maxLength={160}
            className={INPUT}
            data-testid="article-title-input"
          />
        </div>
        <div>
          <label htmlFor="article-summary" className={LABEL}>
            Resumen
          </label>
          <textarea
            id="article-summary"
            value={draft.summary}
            onChange={(event) => onChange({ summary: event.target.value })}
            disabled={disabled}
            maxLength={500}
            rows={2}
            className={INPUT}
            data-testid="article-summary-input"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-[200px_120px_1fr]">
          <div>
            <label htmlFor="article-phase" className={LABEL}>
              Fase
            </label>
            <PhaseSelect
              id="article-phase"
              value={draft.phase}
              onChange={(phase) => onChange({ phase })}
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor="article-order" className={LABEL}>
              Orden
            </label>
            <input
              id="article-order"
              type="number"
              min={0}
              max={999}
              value={draft.order}
              onChange={(event) => onChange({ order: event.target.value })}
              disabled={disabled}
              className={INPUT}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="article-slug" className={LABEL}>
              Slug
            </label>
            <input
              id="article-slug"
              value={draft.slug}
              onChange={(event) => onChange({ slug: event.target.value })}
              disabled={disabled || slugLocked}
              maxLength={80}
              aria-describedby={slugLocked ? "article-slug-locked" : undefined}
              className={INPUT}
              data-testid="article-slug-input"
            />
            {slugLocked && (
              <p
                id="article-slug-locked"
                className="mt-1 flex items-start gap-1 text-xs text-gray-500"
                data-testid="article-slug-locked"
              >
                <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                No se puede cambiar: el artículo ya se publicó y la app lo usa
                como enlace.
              </p>
            )}
          </div>
        </div>
        <p
          className="text-sm text-gray-500"
          data-testid="article-reading-minutes"
        >
          Lectura estimada: {article.readingMinutes} min
          <span className="text-gray-400"> (se recalcula al guardar)</span>
        </p>
      </section>

      <section className={CARD}>
        <h2 className="mb-3 font-semibold text-gray-900">Contenido</h2>
        <ContentBlocksEditor
          blocks={draft.body}
          onChange={(body) => onChange({ body })}
          disabled={disabled}
        />
      </section>

      <section className={CARD}>
        <h2 className="mb-3 font-semibold text-gray-900">Fuentes</h2>
        <ArticleSourcesEditor
          sources={draft.sources}
          onChange={(sources) => onChange({ sources })}
          disabled={disabled}
        />
      </section>
    </div>
  );
}
