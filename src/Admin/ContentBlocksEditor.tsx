import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ContentBlock, ContentBlockType } from "@/api/learn";
import { ICON_BUTTON, INPUT, SECONDARY_BUTTON } from "@/Admin/contentUi";

const BLOCK_LABEL: Record<ContentBlockType, string> = {
  heading: "Subtítulo",
  paragraph: "Párrafo",
  list: "Lista",
  callout: "Consulta a tu médico",
};

const NEW_BLOCK: Record<ContentBlockType, () => ContentBlock> = {
  heading: () => ({ type: "heading", text: "" }),
  paragraph: () => ({ type: "paragraph", text: "" }),
  list: () => ({ type: "list", items: [""] }),
  callout: () => ({ type: "callout", tone: "see_doctor", text: "" }),
};

const BLOCK_TYPES: ContentBlockType[] = [
  "heading",
  "paragraph",
  "list",
  "callout",
];

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

interface BlockFieldProps {
  block: ContentBlock;
  index: number;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}

function BlockField({ block, index, disabled, onChange }: BlockFieldProps) {
  const fieldId = `block-${index}-field`;
  const label = `${BLOCK_LABEL[block.type]} ${index + 1}`;
  if (block.type === "heading") {
    return (
      <input
        id={fieldId}
        aria-label={label}
        value={block.text}
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        disabled={disabled}
        maxLength={4000}
        className={`${INPUT} font-semibold`}
        data-testid="block-field"
      />
    );
  }
  if (block.type === "list") {
    return (
      <>
        <textarea
          id={fieldId}
          aria-label={label}
          value={block.items.join("\n")}
          onChange={(event) =>
            onChange({ type: "list", items: event.target.value.split("\n") })
          }
          disabled={disabled}
          rows={Math.max(3, block.items.length)}
          className={INPUT}
          data-testid="block-field"
        />
        <p className="mt-1 text-xs text-gray-500">Un elemento por línea.</p>
      </>
    );
  }
  return (
    <>
      <textarea
        id={fieldId}
        aria-label={label}
        value={block.text}
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        disabled={disabled}
        maxLength={4000}
        rows={block.type === "callout" ? 3 : 4}
        className={INPUT}
        data-testid="block-field"
      />
      <p className="mt-1 text-xs text-gray-500">Usa **texto** para negrita.</p>
    </>
  );
}

interface ContentBlocksEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  disabled: boolean;
}

export function ContentBlocksEditor({
  blocks,
  onChange,
  disabled,
}: ContentBlocksEditorProps) {
  const replaceAt = (index: number, block: ContentBlock) =>
    onChange(blocks.map((current, i) => (i === index ? block : current)));

  return (
    <div className="space-y-3" data-testid="blocks-editor">
      {blocks.length === 0 && (
        <p className="rounded-[10px] border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          El artículo todavía no tiene contenido. Agrega un bloque para empezar.
        </p>
      )}
      {blocks.map((block, index) => (
        <div
          key={index}
          className={
            block.type === "callout"
              ? "rounded-[10px] border border-rose-200 bg-rose-50/50 p-3"
              : "rounded-[10px] border border-gray-200 p-3"
          }
          data-testid="block-editor-item"
          data-block-type={block.type}
        >
          <div className="mb-2 flex items-center gap-1">
            <span className="mr-auto text-xs font-semibold uppercase tracking-wide text-gray-500">
              {BLOCK_LABEL[block.type]}
            </span>
            <button
              type="button"
              onClick={() => onChange(moveItem(blocks, index, index - 1))}
              disabled={disabled || index === 0}
              className={ICON_BUTTON}
              aria-label={`Subir bloque ${index + 1}`}
              data-testid="block-move-up"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(moveItem(blocks, index, index + 1))}
              disabled={disabled || index === blocks.length - 1}
              className={ICON_BUTTON}
              aria-label={`Bajar bloque ${index + 1}`}
              data-testid="block-move-down"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}
              disabled={disabled}
              className={`${ICON_BUTTON} hover:bg-red-50 hover:text-red-700`}
              aria-label={`Eliminar bloque ${index + 1}`}
              data-testid="block-remove"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <BlockField
            block={block}
            index={index}
            disabled={disabled}
            onChange={(updated) => replaceAt(index, updated)}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange([...blocks, NEW_BLOCK[type]()])}
            disabled={disabled}
            className={`${SECONDARY_BUTTON} px-3 py-1.5 text-xs`}
            data-testid={`block-add-${type}`}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {BLOCK_LABEL[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
