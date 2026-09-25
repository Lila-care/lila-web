import { ExternalLink } from "lucide-react";
import type { ArticleSource, ContentBlock, LearnPhase } from "@/api/learn";
import { ContentBlocks } from "@/components/ContentBlocks";
import { phaseLabel } from "@/Admin/contentLabels";
import { cn } from "@/lib/utils";

export interface ArticlePreviewContent {
  title: string;
  summary: string;
  phase: LearnPhase;
  readingMinutes: number;
  body: ContentBlock[];
  sources: ArticleSource[];
}

interface ArticlePreviewProps {
  content: ArticlePreviewContent;
  // Comparison view: flag what differs from the published copy.
  highlightedBlockIndexes?: ReadonlySet<number>;
  highlightTitle?: boolean;
  highlightSummary?: boolean;
  testId?: string;
}

const HIGHLIGHT = "rounded-lg bg-amber-50 ring-1 ring-amber-200 -mx-2 px-2";

// The article as the user reads it in "Aprende" (header + blocks + sources).
export function ArticlePreview({
  content,
  highlightedBlockIndexes,
  highlightTitle = false,
  highlightSummary = false,
  testId = "article-preview",
}: ArticlePreviewProps) {
  return (
    <article
      className="min-w-0 rounded-[16px] bg-[#FAF6F0] p-5 md:p-8"
      data-testid={testId}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9B72C8]">
        {phaseLabel(content.phase)} · {content.readingMinutes} min de lectura
      </p>
      <h2
        className={cn(
          "mb-3 break-words text-2xl font-bold text-[#3D2B50] md:text-3xl",
          highlightTitle && HIGHLIGHT,
        )}
        style={{ fontFamily: "'Playfair Display', serif" }}
        data-testid="preview-title"
      >
        {content.title || "Sin título"}
      </h2>
      {content.summary && (
        <p
          className={cn(
            "mb-6 break-words text-base text-[#3D2B50]/80",
            highlightSummary && HIGHLIGHT,
          )}
        >
          {content.summary}
        </p>
      )}
      {content.body.length > 0 ? (
        <ContentBlocks
          blocks={content.body}
          highlightedIndexes={highlightedBlockIndexes}
        />
      ) : (
        <p className="text-sm text-gray-500">
          Este artículo no tiene contenido.
        </p>
      )}
      <SourcesList sources={content.sources} />
    </article>
  );
}

function SourcesList({ sources }: { sources: ArticleSource[] }) {
  return (
    <footer className="mt-8 border-t border-[#3D2B50]/10 pt-4">
      <h3 className="mb-2 text-sm font-semibold text-[#3D2B50]">Fuentes</h3>
      {sources.length === 0 ? (
        <p className="text-sm text-gray-500">Sin fuentes.</p>
      ) : (
        <ul className="space-y-2" data-testid="preview-sources">
          {sources.map((source, index) => (
            <li key={index} className="text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1 break-all"
                data-testid="preview-source-link"
              >
                <span className="text-[#6c4a91] underline">{source.title}</span>
                <ExternalLink
                  className="mt-0.5 size-3.5 shrink-0 text-[#6c4a91]"
                  aria-hidden="true"
                />
              </a>
              <span className="block text-xs text-gray-500">
                {source.publisher}
              </span>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
