import { useMemo, useState } from "react";
import type { ContentBlock, PublishedArticle } from "@/api/learn";
import {
  ArticlePreview,
  type ArticlePreviewContent,
} from "@/Admin/ArticlePreview";
import { cn } from "@/lib/utils";

type ComparisonView = "proposed" | "published" | "side_by_side";

// Block-level diff is enough for a medical review: flag every proposed block that doesn't
// exist verbatim in the published copy (new, edited or moved text).
function changedBlockIndexes(
  proposed: ContentBlock[],
  published: ContentBlock[],
): Set<number> {
  const publishedBlocks = new Set(
    published.map((block) => JSON.stringify(block)),
  );
  const changed = new Set<number>();
  proposed.forEach((block, index) => {
    if (!publishedBlocks.has(JSON.stringify(block))) changed.add(index);
  });
  return changed;
}

interface ArticleVersionComparisonProps {
  proposed: ArticlePreviewContent & { version: number };
  published: PublishedArticle;
}

export function ArticleVersionComparison({
  proposed,
  published,
}: ArticleVersionComparisonProps) {
  const [view, setView] = useState<ComparisonView>("proposed");
  const changed = useMemo(
    () => changedBlockIndexes(proposed.body, published.body),
    [proposed.body, published.body],
  );

  const options: { id: ComparisonView; label: string; className?: string }[] = [
    { id: "proposed", label: `Propuesta (v${proposed.version})` },
    { id: "published", label: `Publicada (v${published.version})` },
    // Two reading columns don't fit on a phone.
    {
      id: "side_by_side",
      label: "Lado a lado",
      className: "hidden md:inline-flex",
    },
  ];

  const proposedPreview = (
    <ArticlePreview
      content={proposed}
      highlightedBlockIndexes={changed}
      highlightTitle={proposed.title !== published.title}
      highlightSummary={proposed.summary !== published.summary}
      testId="article-preview-proposed"
    />
  );
  const publishedPreview = (
    <ArticlePreview content={published} testId="article-preview-published" />
  );

  return (
    <div className="space-y-3" data-testid="article-version-comparison">
      <div
        role="radiogroup"
        aria-label="Versión a mostrar"
        className="inline-flex flex-wrap gap-1 rounded-[10px] bg-gray-100 p-1"
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={view === option.id}
            onClick={() => setView(option.id)}
            className={cn(
              "inline-flex rounded-[8px] px-3 py-1.5 text-sm",
              view === option.id
                ? "bg-white font-semibold text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
              option.className,
            )}
            data-testid={`comparison-${option.id}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {view !== "published" && changed.size > 0 && (
        <p className="text-xs text-gray-500">
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-amber-200 align-middle" />
          Resaltado: nuevo o modificado respecto a la versión publicada.
        </p>
      )}
      {view === "proposed" && proposedPreview}
      {view === "published" && publishedPreview}
      {view === "side_by_side" && (
        <div className="grid gap-4 md:grid-cols-2">
          {proposedPreview}
          {publishedPreview}
        </div>
      )}
    </div>
  );
}
