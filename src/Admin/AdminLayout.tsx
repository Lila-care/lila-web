import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  AdminNavItem,
  AdminTabItem,
  type AdminNavTone,
  type AdminNavLink,
} from "@/Admin/AdminNavItem";

const NAV_LINKS: AdminNavLink[] = [
  {
    id: "dashboard",
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  { id: "users", href: "/admin/users", label: "Usuarias", icon: Users },
  { id: "reports", href: "/admin/reports", label: "Reportes", icon: FileText },
  {
    id: "forms",
    href: "/admin/forms",
    label: "Formularios",
    icon: ClipboardList,
  },
  // Figma Gestión de Planes reuses the clipboard-list icon for Planes.
  { id: "plans", href: "/admin/plans", label: "Planes", icon: ClipboardList },
];

interface AdminLayoutProps {
  children: ReactNode;
  // "neutral" drops the teal active mark — Figma error state (314:1172) keeps the nav quiet
  // while the page reports a failure.
  navTone?: AdminNavTone;
}

function useAdminLogout() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      // `logout()` already navigates to /chat — but the admin panel's own login screen is
      // /admin, so send the user there instead of the public chat landing page.
      navigate("/admin");
    } finally {
      setLoggingOut(false);
    }
  };

  return { loggingOut, handleLogout };
}

// Sidebar: "Lila Admin" on one baseline. Rail (80px): no room for "Admin", just "Lila".
function Wordmark() {
  return (
    <div className="flex items-baseline justify-center gap-2 lg:justify-start lg:px-6">
      <span className="type-h4-strong text-text-on-brand">Lila</span>
      <span className="type-caption hidden text-surface-brand-light lg:inline">
        Admin
      </span>
    </div>
  );
}

// Three shells from one layout, per Figma 304:9: ≥lg sidebar 220px, md rail 80px (icon over
// label), <md bottom tab bar. Applies to every admin page.
export default function AdminLayout({
  children,
  navTone = "default",
}: AdminLayoutProps) {
  const [location] = useLocation();
  const { loggingOut, handleLogout } = useAdminLogout();
  const isActive = (href: string) => location.startsWith(href);
  const logoutLabel = loggingOut ? "Cerrando sesión..." : "Cerrar sesión";

  return (
    <div className="flex min-h-screen w-full bg-surface-warm">
      {/* The <aside> stretches with the page so its background always covers the full height;
          the inner column is what sticks to the viewport while scrolling. No z-index needed:
          nothing in it overlays page content. */}
      <aside
        className="hidden min-h-screen shrink-0 self-stretch bg-nav-background md:block md:w-20 lg:w-55"
        data-testid="admin-sidebar"
      >
        <div className="sticky top-0 flex h-screen flex-col gap-8 py-8">
          <Wordmark />
          <nav aria-label="Administración" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <AdminNavItem
                key={link.id}
                link={link}
                active={isActive(link.href)}
                tone={navTone}
              />
            ))}
          </nav>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={logoutLabel}
            className="flex h-16 flex-col items-center justify-center gap-1 disabled:opacity-60 lg:h-10 lg:flex-row lg:justify-start lg:gap-3 lg:pl-6"
            data-testid="logout-button"
          >
            <LogOut className="size-5 shrink-0 text-teal-500" aria-hidden="true" />
            <span className="type-caption text-surface-brand-light lg:hidden">
              Salir
            </span>
            <span className="type-body-md hidden text-surface-brand-light lg:inline">
              {logoutLabel}
            </span>
          </button>
        </div>
      </aside>

      {/* `min-w-0` — flex item; without it a wide child (table) refuses to shrink and pushes
          the page past the viewport. Below md the bottom padding clears the fixed tab bar
          (64px + iOS safe area) so it never covers the last row. */}
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="min-w-0 flex-1">{children}</div>
        {/* Figma 375 has no top bar: logout is a text link at the end of the content. */}
        <div className="mx-4 border-t border-border-default py-4 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="type-body-md text-text-secondary underline-offset-2 hover:underline disabled:opacity-60"
            data-testid="logout-button-mobile"
          >
            {logoutLabel}
          </button>
        </div>
      </main>

      <nav
        aria-label="Administración"
        className="fixed inset-x-0 bottom-0 z-20 flex bg-nav-background pb-[env(safe-area-inset-bottom)] md:hidden"
        data-testid="admin-tab-bar"
      >
        {NAV_LINKS.map((link) => (
          <AdminTabItem
            key={link.id}
            link={link}
            active={isActive(link.href)}
            tone={navTone}
          />
        ))}
      </nav>
    </div>
  );
}
