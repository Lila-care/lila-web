import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { TOKEN_KEY, useAuth } from "@/auth/AuthContext";
import { savePostLoginRedirect } from "@/auth/postLoginRedirect";
import CheckoutContent from "./CheckoutContent";
import CheckoutLayout, { PageTitle } from "./CheckoutLayout";
import { CheckoutSkeleton } from "./CheckoutStates";

// /checkout needs a session (quotes and confirmation are authenticated). It is NOT wrapped in
// ProtectedRoute because that sends guests to the admin login; here a guest goes to the
// consumer login and is brought back by AuthCallback.
export default function CheckoutPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const hasRedirectedRef = useRef(false);
  const requestedPlanId = new URLSearchParams(search).get("planId");

  const isGuest = !isLoading && !isAuthenticated;

  useEffect(() => {
    if (!isGuest || hasRedirectedRef.current) return;
    // Coming back from AuthCallback, wouter's navigation (sync external-store update) can
    // render this page before AuthProvider commits the token it just persisted. The token
    // already in storage is the truth: that isn't a guest, the context is about to catch up.
    if (localStorage.getItem(TOKEN_KEY)) return;
    hasRedirectedRef.current = true;
    savePostLoginRedirect(window.location.pathname + window.location.search);
    navigate("/login", { replace: true });
  }, [isGuest, navigate]);

  if (!isAuthenticated) {
    return (
      <CheckoutLayout announcement="Cargando tu plan" isBusy>
        <PageTitle />
        <CheckoutSkeleton />
      </CheckoutLayout>
    );
  }

  return <CheckoutContent requestedPlanId={requestedPlanId} />;
}
