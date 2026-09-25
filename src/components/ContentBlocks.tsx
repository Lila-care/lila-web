import { Stethoscope } from "lucide-react";
import type { ContentBlock } from "@/api/learn";
import { parseBoldSegments } from "@/lib/inlineBold";
import { cn } from "@/lib/utils";

// Renders Learn article blocks exactly as the user sees them. Shared by the admin review
// preview and the public "Aprende" article page — keep it free of admin-only concerns.

export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseBoldSegments(text).map((segment, index) =>
        segment.bold ? (
          <strong key={index} className="font-semibold">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function SeeDoctorCallout({ text }: { text: string }) {
  return (
    <aside
      data-testid="content-block-callout"
      className="flex gap-3 rounded-2xl border-l-4 border-[#8B3A52] bg-[#FBEFF2] p-4 text-[#5A2335]"
    >
      <Stethoscope className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="mb-1 text-sm font-semibold">Consulta a tu médico</p>
        <p className="text-[15px] leading-relaxed">
          <InlineText text={text} />
        </p>
      </div>
    </aside>
  );
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h3
          data-testid="content-block-heading"
          className="pt-2 text-lg font-semibold text-[#3D2B50]"
        >
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p
          data-testid="content-block-paragraph"
          className="text-[15px] leading-relaxed text-[#3D2B50]"
        >
          <InlineText text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul
          data-testid="content-block-list"
          className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[#3D2B50]"
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "callout":
      return <SeeDoctorCallout text={block.text} />;
  }
}

interface ContentBlocksProps {
  blocks: ContentBlock[];
  // Indexes to flag as new/changed (admin comparison view only).
  highlightedIndexes?: ReadonlySet<number>;
  className?: string;
}

export function ContentBlocks({
  blocks,
  highlightedIndexes,
  className,
}: ContentBlocksProps) {
  return (
    <div
      className={cn("space-y-4 break-words", className)}
      data-testid="content-blocks"
    >
      {blocks.map((block, index) => {
        const highlighted = highlightedIndexes?.has(index) ?? false;
        return (
          <div
            key={index}
            data-highlighted={highlighted || undefined}
            className={cn(
              highlighted &&
                "-mx-2 rounded-lg bg-amber-50 px-2 py-1 ring-1 ring-amber-200",
            )}
          >
            <ContentBlockView block={block} />
          </div>
        );
      })}
    </div>
  );
}
