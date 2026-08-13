import { X } from "lucide-react";
import { useUserDetail } from "@/Admin/useUsers";
import { formatDateLong } from "@/Admin/dashboardFormat";
import { Button } from "@/components/ui/button";

interface UserDetailsProps {
  userId: string;
  onClose?: () => void;
}

function UserDetails({ userId, onClose }: UserDetailsProps) {
  const { user, loading, error } = useUserDetail(userId);

  return (
    <div className="p-6" data-testid="user-details">
      {onClose && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar detalle de usuaria"
            data-testid="user-details-close"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {loading && (
        <p className="p-4 text-gray-500" data-testid="user-details-loading">
          Cargando...
        </p>
      )}

      {!loading && error && (
        <p className="p-4 text-red-500" data-testid="user-details-error">
          Error al cargar la usuaria: {error}
        </p>
      )}

      {!loading && !error && !user && (
        <p className="p-4 text-red-500" data-testid="user-details-empty">
          Usuaria no encontrada
        </p>
      )}

      {!loading && !error && user && (
        <div className="space-y-2 text-gray-700">
          <h2 className="text-xl font-bold">
            {user.preferredName ?? user.email ?? user.userId}
          </h2>
          <p>
            <span className="font-semibold">Usuaria ID:</span> {user.userId}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user.email ?? "—"}
          </p>
          <p>
            <span className="font-semibold">Plan(es):</span>{" "}
            {user.tiers.length > 0 ? user.tiers.join(", ") : "Sin plan"}
          </p>
          <p>
            <span className="font-semibold">Reportes de ciclo:</span>{" "}
            {user.cycleReports}
          </p>
          <p>
            <span className="font-semibold">Conversaciones:</span>{" "}
            {user.conversations}
          </p>
          <p>
            <span className="font-semibold">Última actividad:</span>{" "}
            {user.lastActivityAt
              ? formatDateLong(user.lastActivityAt)
              : "Nunca"}
          </p>
        </div>
      )}
    </div>
  );
}

export default UserDetails;
