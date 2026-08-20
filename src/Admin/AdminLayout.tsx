// src/layouts/AdminLayout.tsx
import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Loader2,
  User,
  Users,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/forms", label: "Forms", icon: ClipboardList },
  { href: "/admin/plans", label: "Planes", icon: CreditCard },
  { href: "/admin/subscribers", label: "Suscriptoras", icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      // `logout()` already navigates to /chat — but the admin panel's own login screen is
      // /admin, so send the user there instead of the public chat landing page.
      navigate("/admin");
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* TOP NAVBAR */}
      <header className="bg-primary shadow-sm h-16 flex items-center px-6 justify-between">
        {/* Logo */}
        <div className="text-xl font-bold text-white">Lila Admin</div>

        {/* Navigation */}
        <nav aria-label="Navegación principal" className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                  isActive
                    ? "bg-white text-primary font-semibold"
                    : "text-white/80 hover:text-white hover:bg-white/10",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Icons Right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notificaciones"
            className="rounded-full p-2 text-white hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <Bell className="size-5" aria-hidden="true" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center justify-center rounded-full p-2 text-white hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              data-testid="user-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <User className="size-6" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-neutral-200 py-1 z-50"
                data-testid="user-menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-secondary transition disabled:opacity-50"
                  data-testid="logout-button"
                >
                  {loggingOut ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LogOut className="size-4" aria-hidden="true" />
                  )}
                  {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
