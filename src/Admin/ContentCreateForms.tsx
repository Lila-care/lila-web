import { FormEvent, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  createArticle,
  generateArticleDraft,
  type LearnArticle,
  type LearnPhase,
} from "@/api/learn";
import { PhaseSelect } from "@/Admin/PhaseSelect";
import { MutationErrorAlert } from "@/Admin/ContentStateViews";
import { useContentMutation } from "@/Admin/useContentMutation";
import {
  CARD,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "@/Admin/contentUi";
import { isValidSlug, slugify } from "@/lib/slug";

const MAX_ORDER = 999;
const SLUG_HINT =
  "Solo minúsculas, números y guiones (ej. que-es-la-fase-lutea).";

interface CreateFormProps {
  onCreated: (article: LearnArticle) => void;
  onCancel: () => void;
}

// Empty input = "let the BE default it" (order 0 / slug from the title).
function parseOptionalOrder(value: string): number | undefined | null {
  if (value.trim() === "") return undefined;
  const order = Number(value);
  return Number.isInteger(order) && order >= 0 && order <= MAX_ORDER
    ? order
    : null;
}

function OrderField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Orden
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={MAX_ORDER}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={INPUT}
        placeholder="0"
      />
    </div>
  );
}

export function NewArticleForm({ onCreated, onCancel }: CreateFormProps) {
  const { token } = useAuth();
  const { pending, error, run } = useContentMutation();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [phase, setPhase] = useState<LearnPhase>("MENSTRUATION");
  const [order, setOrder] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedOrder = parseOptionalOrder(order);
    if (!title.trim()) return setValidationError("Escribe un título.");
    if (!isValidSlug(effectiveSlug)) return setValidationError(SLUG_HINT);
    if (parsedOrder === null) {
      return setValidationError(
        `El orden debe ser un número entre 0 y ${MAX_ORDER}.`,
      );
    }
    setValidationError(null);
    if (!token) return;
    const created = await run("create", () =>
      createArticle(token, {
        slug: effectiveSlug,
        phase,
        title: title.trim(),
        order: parsedOrder,
      }),
    );
    if (created) onCreated(created);
  };

  const submitting = pending === "create";

  return (
    <form
      onSubmit={handleSubmit}
      className={`${CARD} space-y-4`}
      data-testid="new-article-form"
      noValidate
    >
      <h2 className="text-lg font-semibold text-gray-900">Nuevo artículo</h2>
      <div>
        <label htmlFor="new-article-title" className={LABEL}>
          Título
        </label>
        <input
          id="new-article-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
          className={INPUT}
          data-testid="new-article-title"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_200px_120px]">
        <div className="min-w-0">
          <label htmlFor="new-article-slug" className={LABEL}>
            Slug
          </label>
          <input
            id="new-article-slug"
            value={effectiveSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            maxLength={80}
            className={INPUT}
            data-testid="new-article-slug"
          />
          <p className="mt-1 text-xs text-gray-500">{SLUG_HINT}</p>
        </div>
        <div>
          <label htmlFor="new-article-phase" className={LABEL}>
            Fase
          </label>
          <PhaseSelect
            id="new-article-phase"
            value={phase}
            onChange={setPhase}
          />
        </div>
        <OrderField id="new-article-order" value={order} onChange={setOrder} />
      </div>

      {validationError && (
        <p
          className="text-sm text-red-600"
          data-testid="create-validation-error"
        >
          {validationError}
        </p>
      )}
      {error && <MutationErrorAlert message={error.message} />}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className={PRIMARY_BUTTON}
          data-testid="new-article-submit"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Creando..." : "Crear borrador"}
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function GenerateDraftForm({ onCreated, onCancel }: CreateFormProps) {
  const { token } = useAuth();
  const { pending, error, run } = useContentMutation();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<LearnPhase>("MENSTRUATION");
  const [slug, setSlug] = useState("");
  const [order, setOrder] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const generating = pending === "generate";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedOrder = parseOptionalOrder(order);
    if (!title.trim()) return setValidationError("Escribe un título.");
    if (!brief.trim()) {
      return setValidationError("Describe qué debe cubrir el artículo.");
    }
    if (slug && !isValidSlug(slug)) return setValidationError(SLUG_HINT);
    if (parsedOrder === null) {
      return setValidationError(
        `El orden debe ser un número entre 0 y ${MAX_ORDER}.`,
      );
    }
    setValidationError(null);
    if (!token) return;
    const created = await run("generate", () =>
      generateArticleDraft(token, {
        phase,
        title: title.trim(),
        brief: brief.trim(),
        slug: slug || undefined,
        order: parsedOrder,
      }),
    );
    if (created) onCreated(created);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${CARD} space-y-4`}
      data-testid="generate-draft-form"
      aria-busy={generating}
      noValidate
    >
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          Generar borrador con IA
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          El borrador se escribe solo con fuentes de la base de conocimiento y
          siempre pasa por revisión médica antes de publicarse.
        </p>
      </div>
      <fieldset disabled={generating} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div className="min-w-0">
            <label htmlFor="draft-title" className={LABEL}>
              Título
            </label>
            <input
              id="draft-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className={INPUT}
              data-testid="draft-title"
            />
          </div>
          <div>
            <label htmlFor="draft-phase" className={LABEL}>
              Fase
            </label>
            <PhaseSelect id="draft-phase" value={phase} onChange={setPhase} />
          </div>
        </div>
        <div>
          <label htmlFor="draft-brief" className={LABEL}>
            ¿Qué debe cubrir?
          </label>
          <textarea
            id="draft-brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            maxLength={2000}
            rows={4}
            className={INPUT}
            placeholder="Ej. Cambios de energía y ánimo en la fase lútea, qué es normal y cuándo consultar."
            data-testid="draft-brief"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <div className="min-w-0">
            <label htmlFor="draft-slug" className={LABEL}>
              Slug (opcional)
            </label>
            <input
              id="draft-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={80}
              className={INPUT}
              placeholder="Se genera a partir del título"
            />
          </div>
          <OrderField id="draft-order" value={order} onChange={setOrder} />
        </div>
      </fieldset>

      {generating && (
        <p
          className="flex items-center gap-2 rounded-[10px] bg-violet-50 p-3 text-sm text-violet-800"
          data-testid="draft-generating"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Generando borrador con IA. Puede tardar varios segundos, no cierres
          esta página.
        </p>
      )}
      {validationError && (
        <p
          className="text-sm text-red-600"
          data-testid="create-validation-error"
        >
          {validationError}
        </p>
      )}
      {error && <MutationErrorAlert message={error.message} />}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={generating}
          className={PRIMARY_BUTTON}
          data-testid="generate-draft-submit"
        >
          {generating && <Loader2 className="size-4 animate-spin" />}
          {generating ? "Generando..." : "Generar borrador"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={generating}
          className={SECONDARY_BUTTON}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
