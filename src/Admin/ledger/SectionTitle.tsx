interface SectionTitleProps {
  id: string;
  title: string;
  caption?: string;
}

export function SectionTitle({ id, title, caption }: SectionTitleProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-default pb-1">
      <h2 id={id} className="type-body-md-strong text-text-primary">
        {title}
      </h2>
      {caption && (
        <span className="type-caption shrink-0 text-text-secondary">
          {caption}
        </span>
      )}
    </div>
  );
}
