import { Archive, BadgeCheck, Eye, Info } from "lucide-react";
import { ReactNode } from "react";
import type { LearnArticle } from "@/api/learn";
import { ReviewNotesNotice } from "@/Admin/ReviewNotesNotice";
import { formatDateTime } from "@/Admin/contentLabels";

function Notice({
  icon,
  children,
  testId,
}: {
  icon: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-[10px] border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
      data-testid={testId}
      role="note"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Status context the admin/reviewer needs before acting on the article.
export function ArticleNotices({ article }: { article: LearnArticle }) {
  const { published, status, review } = article;
  const publishedIsBehind = published && published.version !== article.version;

  return (
    <div className="space-y-3 empty:hidden">
      {status === "CHANGES_REQUESTED" && review?.notes && (
        <ReviewNotesNotice notes={review.notes} />
      )}
      {publishedIsBehind && !article.archivedAt && (
        <Notice
          icon={<Eye className="size-4" aria-hidden="true" />}
          testId="published-version-notice"
        >
          La versión publicada (v{published.version}) sigue visible en la app
          hasta que publiques esta versión.
        </Notice>
      )}
      {status === "IN_REVIEW" && (
        <Notice
          icon={<Info className="size-4" aria-hidden="true" />}
          testId="in-review-notice"
        >
          En revisión médica (v{article.version}).
        </Notice>
      )}
      {status === "APPROVED" && review?.decision === "approve" && (
        <Notice
          icon={<BadgeCheck className="size-4 text-green-700" aria-hidden="true" />}
          testId="approved-notice"
        >
          Aprobado por revisión médica (v{review.reviewedVersion}) el{" "}
          {formatDateTime(review.reviewedAt)}. Listo para publicar.
        </Notice>
      )}
      {article.archivedAt && (
        <Notice
          icon={<Archive className="size-4" aria-hidden="true" />}
          testId="archived-notice"
        >
          Archivado: no se ve en la app. Para volver a mostrarlo, edítalo,
          envíalo a revisión y publícalo de nuevo.
        </Notice>
      )}
    </div>
  );
}
