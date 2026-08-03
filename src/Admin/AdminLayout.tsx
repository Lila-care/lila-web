// src/layouts/AdminLayout.tsx
import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      <header className="bg-primary border-b h-16 flex items-center px-6 justify-between shadow-sm">
        {/* Logo */}
        <div className="text-xl font-bold text-white">Lila Admin</div>

        {/* Navigation */}
        <nav className="flex gap-6">
          <a href="/admin" className="hover:text-accent text-white">
            Dashboard
          </a>
          <a href="/admin/users" className="hover:text-accent text-white">
            Users
          </a>
          <a href="/admin/reports" className="hover:text-accent text-white">
            Reports
          </a>
          <a href="/admin/forms" className="hover:text-accent text-white">
            Forms
          </a>
        </nav>

        {/* Icons Right */}
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-white cursor-pointer" />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center justify-center cursor-pointer"
              data-testid="user-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <User className="w-6 h-6 text-white" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50"
                data-testid="user-menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4" />
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
