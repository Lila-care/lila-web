import { Plus, Trash2 } from "lucide-react";
import type { ArticleSource } from "@/api/learn";
import { ICON_BUTTON, INPUT, SECONDARY_BUTTON } from "@/Admin/contentUi";

const EMPTY_SOURCE: ArticleSource = { title: "", url: "", publisher: "" };

interface ArticleSourcesEditorProps {
  sources: ArticleSource[];
  onChange: (sources: ArticleSource[]) => void;
  disabled: boolean;
}

export function ArticleSourcesEditor({
  sources,
  onChange,
  disabled,
}: ArticleSourcesEditorProps) {
  const updateAt = (index: number, field: keyof ArticleSource, value: string) =>
    onChange(
      sources.map((source, i) =>
        i === index ? { ...source, [field]: value } : source,
      ),
    );

  return (
    <div className="space-y-3" data-testid="sources-editor">
      {sources.length === 0 && (
        <p className="text-sm text-gray-500">
          Sin fuentes. Se necesita al menos una para enviar a revisión.
        </p>
      )}
      {sources.map((source, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-[10px] border border-gray-200 p-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-center"
          data-testid="source-editor-item"
        >
          <input
            aria-label={`Título de la fuente ${index + 1}`}
            placeholder="Título"
            value={source.title}
            onChange={(event) => updateAt(index, "title", event.target.value)}
            disabled={disabled}
            maxLength={300}
            className={INPUT}
          />
          <input
            aria-label={`URL de la fuente ${index + 1}`}
            placeholder="https://"
            type="url"
            value={source.url}
            onChange={(event) => updateAt(index, "url", event.target.value)}
            disabled={disabled}
            className={INPUT}
          />
          <input
            aria-label={`Entidad de la fuente ${index + 1}`}
            placeholder="Entidad (ej. MedlinePlus)"
            value={source.publisher}
            onChange={(event) =>
              updateAt(index, "publisher", event.target.value)
            }
            disabled={disabled}
            maxLength={120}
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => onChange(sources.filter((_, i) => i !== index))}
            disabled={disabled}
            className={`${ICON_BUTTON} justify-self-end hover:bg-red-50 hover:text-red-700`}
            aria-label={`Eliminar fuente ${index + 1}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...sources, EMPTY_SOURCE])}
        disabled={disabled}
        className={`${SECONDARY_BUTTON} px-3 py-1.5 text-xs`}
        data-testid="source-add"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Fuente
      </button>
    </div>
  );
}
