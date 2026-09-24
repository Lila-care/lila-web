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

function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-col px-6 md:items-center md:px-0 lg:items-start lg:px-6">
      <span className="type-h4-strong text-text-on-brand">Lila</span>
      <span
        className={
          compact
            ? "type-caption text-surface-brand-light"
            : "type-caption text-surface-brand-light md:hidden lg:inline"
        }
      >
        Admin
      </span>
    </div>
  );
}

// Three shells from one layout, per Figma 304:9: ≥lg sidebar 220px with labels, md rail 80px
// (icons + active mark only), <md bottom tab bar. Applies to every admin page.
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
      {/* No z-index needed: nothing inside the sticky sidebar overlays page content anymore
          (the old user dropdown is gone; logout is a plain nav row). */}
      <aside
        className="sticky top-0 hidden h-screen shrink-0 flex-col gap-8 bg-nav-background py-8 md:flex md:w-20 lg:w-55"
        data-testid="admin-sidebar"
      >
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
          className="flex h-10 items-center gap-3 pl-6 text-surface-brand-light disabled:opacity-60 md:justify-center md:pl-0 lg:justify-start lg:pl-6"
          data-testid="logout-button"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          <span className="type-body-md md:sr-only lg:not-sr-only">
            {logoutLabel}
          </span>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below md there is no sidebar and the tab bar only fits the 4 sections, so logout
            lives in this compact top bar. */}
        <header className="flex h-14 items-center justify-between bg-nav-background px-4 md:hidden">
          <Wordmark compact />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={logoutLabel}
            className="flex size-10 items-center justify-center text-surface-brand-light disabled:opacity-60"
            data-testid="logout-button-mobile"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* `min-w-0` — flex item; without it a wide child (table) refuses to shrink and pushes
            the page past the viewport instead of scrolling internally. `pb-16` keeps content
            clear of the fixed tab bar on mobile. */}
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Administración"
        className="fixed inset-x-0 bottom-0 z-20 flex h-16 bg-nav-background md:hidden"
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
