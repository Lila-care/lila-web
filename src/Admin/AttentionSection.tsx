import { Link } from "wouter";
import { useAttentionUsers } from "@/Admin/useAttentionUsers";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { AttentionRow } from "@/Admin/ledger/AttentionRow";

const ATTENTION_LIMIT = 5;

// The BE returns only the first `limit` rows (no total of users needing attention), so the
// Figma "5 de N" note and "Ver todas (N)" count cannot be filled without inventing N.
function describeShown(count: number): string {
  return count === 1 ? "1 usuaria" : `${count} usuarias`;
}

interface AttentionSectionProps {
  hrefFor: (userId: string) => string;
}

// Fetches on its own (independent of the stats range): "who needs attention now".
export default function AttentionSection({ hrefFor }: AttentionSectionProps) {
  const { data, loading, error, refetch } = useAttentionUsers(ATTENTION_LIMIT);

  const shown = data.slice(0, ATTENTION_LIMIT).length;

  return (
    <section
      aria-labelledby="attention-section-title"
      data-testid="attention-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle
        id="attention-section-title"
        title="Requieren atención"
        caption={shown > 0 ? describeShown(shown) : undefined}
      />

      {loading && <LedgerSkeleton rows={3} testId="attention-loading" />}

      {!loading && error && (
        <LedgerError
          message="No pudimos cargar las usuarias que requieren atención."
          onRetry={refetch}
          testId="attention-error"
        />
      )}

      {!loading && !error && data.length === 0 && (
        <p
          className="type-body-md py-2 text-text-secondary"
          data-testid="attention-empty"
        >
          Nadie requiere atención
        </p>
      )}

      {!loading && !error && data.length > 0 && (
        <ul>
          {data.slice(0, ATTENTION_LIMIT).map((user) => (
            <AttentionRow
              key={user.userId}
              user={user}
              href={hrefFor(user.userId)}
            />
          ))}
        </ul>
      )}

      {!loading && !error && data.length > 0 && (
        <Link
          href="/admin/users"
          className="type-caption-medium self-start rounded-xs focus-visible:outline-2 focus-visible:outline-teal-700"
          data-testid="attention-view-all"
        >
          <span className="text-teal-700">Ver todas ›</span>
        </Link>
      )}
    </section>
  );
}
