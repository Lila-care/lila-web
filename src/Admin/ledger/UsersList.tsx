import { DashboardUserListItemDto } from "@/api/users";
import { UserRow } from "@/Admin/ledger/UserRow";
import {
  UsersListHeader,
  type UsersSortState,
} from "@/Admin/ledger/UsersListHeader";

interface UsersListProps {
  users: DashboardUserListItemDto[];
  hrefFor: (userId: string) => string;
  sortState?: UsersSortState;
  rowTestId?: string;
  listTestId?: string;
  selectedUserId?: string | null;
}

export function UsersList({
  users,
  hrefFor,
  sortState,
  rowTestId,
  listTestId,
  selectedUserId,
}: UsersListProps) {
  return (
    <div className="min-w-0">
      <UsersListHeader sortState={sortState} />
      <ul data-testid={listTestId}>
        {users.map((user) => (
          <UserRow
            key={user.userId}
            user={user}
            href={hrefFor(user.userId)}
            testId={rowTestId}
            selected={user.userId === selectedUserId}
          />
        ))}
      </ul>
    </div>
  );
}
