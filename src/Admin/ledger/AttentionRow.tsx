import { Link } from "wouter";
import { DashboardUserListItemDto } from "@/api/users";
import { formatRelativeDate } from "@/Admin/dashboardFormat";
import { StageMarker } from "@/Admin/ledger/StageMarker";
import {
  ATTENTION_MARKERS,
  describeAttentionReason,
} from "@/Admin/usersFormat";

interface AttentionRowProps {
  user: DashboardUserListItemDto;
  href: string;
}

// Right-hand time: when the stall started to matter — the last onboarding progress, else the
// last activity, else the signup.
function referenceTime(user: DashboardUserListItemDto): string {
  return user.onboarding?.updatedAt ?? user.lastActivityAt ?? user.createdAt;
}

// Figma AttentionRow (886:2185): email over a marker + reason line; right side = relative
// time over "Ver usuaria ›" (teal-700 on the accent text, a visual cue — the whole row is the
// one link).
export function AttentionRow({ user, href }: AttentionRowProps) {
  const reason = user.attentionReason;
  if (!reason) return null;
  return (
    <li className="border-b border-border-default" data-testid="attention-row">
      <Link
        href={href}
        className="flex min-h-14 items-center gap-4 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`type-body-md truncate ${
              user.email ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            {user.email ?? "Sin email"}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <StageMarker variant={ATTENTION_MARKERS[reason]} />
            <span
              className="type-body-sm min-w-0 text-text-secondary"
              data-testid="attention-reason"
              title={describeAttentionReason(user, reason)}
            >
              {describeAttentionReason(user, reason)}
            </span>
          </span>
        </span>
        <span className="flex w-23 shrink-0 flex-col items-end gap-0.5">
          <span className="type-body-sm text-text-secondary">
            {formatRelativeDate(referenceTime(user))}
          </span>
          <span className="type-caption-medium text-teal-700">Ver usuaria ›</span>
        </span>
      </Link>
    </li>
  );
}
