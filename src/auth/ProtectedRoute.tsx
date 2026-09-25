import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./AuthContext";
import { CONTENT_HOME_PATH, isMedicalReviewerOnly } from "@/lib/adminRoles";

interface ProtectedRouteProps {
  children: ReactNode;
  // Routes a reviewer without the admin group may open (the medical content section). Every
  // other admin route sends her to the content section instead.
  allowMedicalReviewer?: boolean;
}

function ProtectedRoute({
  children,
  allowMedicalReviewer = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-secondary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin" />;
  }

  if (!allowMedicalReviewer && isMedicalReviewerOnly(roles)) {
    return <Redirect to={CONTENT_HOME_PATH} />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
