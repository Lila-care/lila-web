import { useState } from "react";
import { Archive, Loader2, Rocket, Save, Send } from "lucide-react";
import type { ArticleTransition, LearnArticle } from "@/api/learn";
import {
  editResetsReview,
  type ContentActions,
} from "@/Admin/contentPermissions";
import {
  DANGER_TEXT_BUTTON,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SUCCESS_BUTTON,
} from "@/Admin/contentUi";

interface ArticleWorkflowBarProps {
  article: LearnArticle;
  actions: ContentActions;
  mode: "edit" | "preview";
  isDirty: boolean;
  pending: string | null;
  onSave: () => void;
  onTransition: (transition: ArticleTransition) => Promise<boolean>;
}

function Spinner({ active }: { active: boolean }) {
  return active ? <Loader2 className="size-4 animate-spin" /> : null;
}

// Admin actions for the article, gated by status (see contentPermissions.ts). Workflow
// transitions act on the saved version, so they wait until unsaved edits are saved.
export function ArticleWorkflowBar({
  article,
  actions,
  mode,
  isDirty,
  pending,
  onSave,
  onTransition,
}: ArticleWorkflowBarProps) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const busy = pending !== null;
  const blockedByDraft = isDirty || busy;

  return (
    <div className="space-y-3 rounded-[12px] border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "edit" && (
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || busy}
            className={SECONDARY_BUTTON}
            data-testid="article-save"
          >
            {pending === "save" ? (
              <Spinner active />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Guardar
          </button>
        )}
        {actions.canSubmit && (
          <button
            type="button"
            onClick={() => onTransition("submit")}
            disabled={blockedByDraft}
            className={PRIMARY_BUTTON}
            data-testid="article-submit"
          >
            {pending === "submit" ? (
              <Spinner active />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Enviar a revisión
          </button>
        )}
        {actions.canPublish && (
          <button
            type="button"
            onClick={() => onTransition("publish")}
            disabled={blockedByDraft}
            className={SUCCESS_BUTTON}
            data-testid="article-publish"
          >
            {pending === "publish" ? (
              <Spinner active />
            ) : (
              <Rocket className="size-4" aria-hidden="true" />
            )}
            Publicar
          </button>
        )}
        {actions.canArchive && !confirmingArchive && (
          <button
            type="button"
            onClick={() => setConfirmingArchive(true)}
            disabled={busy}
            className={`${DANGER_TEXT_BUTTON} sm:ml-auto`}
            data-testid="article-archive"
          >
            <Archive className="size-4" aria-hidden="true" />
            Archivar
          </button>
        )}
      </div>

      {isDirty && (
        <p
          className="text-sm text-amber-800"
          data-testid="article-unsaved-hint"
        >
          Tienes cambios sin guardar.
          {editResetsReview(article.status) &&
            ` Al guardar se crea la versión v${article.version + 1} y vuelve a borrador: necesitará revisión médica de nuevo.`}
        </p>
      )}

      {confirmingArchive && (
        <div
          className="flex flex-col gap-3 rounded-[10px] border border-red-200 bg-white p-3 sm:flex-row sm:items-center"
          data-testid="article-archive-confirm"
        >
          <p className="text-sm text-gray-700 sm:mr-auto">
            ¿Archivar este artículo? Dejará de verse en la app.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const archived = await onTransition("archive");
                if (!archived) setConfirmingArchive(false);
              }}
              disabled={busy}
              className={PRIMARY_BUTTON}
              data-testid="article-archive-confirm-button"
            >
              <Spinner active={pending === "archive"} />
              Sí, archivar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingArchive(false)}
              disabled={busy}
              className={SECONDARY_BUTTON}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
