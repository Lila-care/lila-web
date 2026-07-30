import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  MessageCircle,
  Calendar,
  BookOpen,
  Sprout,
  UserCircle2,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import AccountBanner from "@/Chat/AccountBanner";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "Hoy", href: "/today", icon: Home, disabled: true },
  { id: "chat", label: "Chat", href: "/chat", icon: MessageCircle },
  { id: "calendar", label: "Calendario", href: "/calendar", icon: Calendar },
  { id: "journal", label: "Diario", href: "#", icon: BookOpen, disabled: true },
  {
    id: "learn",
    label: "Aprende",
    href: "/learn",
    icon: Sprout,
    disabled: true,
  },
  { id: "profile", label: "Perfil", href: "/profile", icon: UserCircle2 },
];

interface SidebarProps {
  // Cuando es true, el sidebar arranca colapsado (hacia la izquierda) y expone un
  // botón para expandirlo/colapsarlo — usado en /chat, que ya tiene su propio rail
  // de conversaciones y no debe mostrar dos barras laterales a la vez.
  collapsible?: boolean;
}

function Sidebar({ collapsible = false }: SidebarProps) {
  const [location] = useLocation();
  const { token, email, name, picture, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(collapsible);

  return (
    <>
      <aside
        data-testid="app-sidebar"
        className={cn(
          "hidden md:flex shrink-0 flex-col h-screen sticky top-0 py-8 overflow-hidden transition-[width,padding,opacity] duration-300 ease-in-out",
          collapsed ? "w-0 px-0 opacity-0" : "w-[248px] px-5 opacity-100",
        )}
        style={{
          background: "linear-gradient(180deg, #FAF6F0, #F3EDF7 60%)",
          borderRight: collapsed ? "none" : "1px solid rgba(61,43,80,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5 px-2 pb-7">
          <img
            src="/sello_vinotinto.svg"
            alt="Lila"
            className="w-[38px] h-[38px] object-contain shrink-0"
          />
          <div className="min-w-0">
            <div
              className="italic font-bold text-2xl leading-none truncate"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#9B72C8",
              }}
            >
              Lila
            </div>
            <div
              className="text-[11.5px] mt-[3px]"
              style={{ color: "rgba(61,43,80,0.55)" }}
            >
              Tu ritmo natural
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 mt-2" data-testid="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <span
                  key={item.id}
                  data-testid={`nav-item-${item.id}`}
                  title="Próximamente"
                  aria-disabled="true"
                  className="flex items-center gap-3 px-3.5 py-[11px] rounded-xl text-[14.5px] font-medium cursor-not-allowed opacity-50"
                  style={{ color: "rgba(61,43,80,0.7)" }}
                >
                  <Icon size={19} />
                  {item.label}
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide">
                    Pronto
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                data-testid={`nav-item-${item.id}`}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-[11px] rounded-xl text-[14.5px] font-medium transition-colors",
                  isActive ? "text-white font-semibold" : "hover:bg-black/5",
                )}
                style={
                  isActive
                    ? {
                        background: "#9B72C8",
                        boxShadow: "0 4px 14px rgba(155,114,200,0.35)",
                      }
                    : { color: "rgba(61,43,80,0.7)" }
                }
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="mt-auto pt-5"
          style={{ borderTop: "1px solid rgba(61,43,80,0.08)" }}
        >
          <AccountBanner
            email={email}
            name={name}
            picture={picture}
            isAuthenticated={!!token}
            onLogout={logout}
          />
        </div>
      </aside>

      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          data-testid="sidebar-toggle"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden md:grid place-items-center fixed z-40 w-11 h-11 p-0 rounded-full transition-[left,transform,box-shadow] duration-300 ease-in-out hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            top: 74,
            left: collapsed ? 12 : 226,
            padding: 0,
            background: "#FFFFFF",
            border: "1px solid rgba(61,43,80,0.08)",
            boxShadow: "0 6px 18px rgba(61,43,80,0.22)",
            outlineColor: "#9B72C8",
          }}
        >
          {collapsed ? (
            <span
              role="img"
              aria-label="Lila"
              className="w-6 h-6"
              style={{
                backgroundImage: "url(/sello_vinotinto.svg)",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <ChevronLeft size={18} style={{ color: "rgba(61,43,80,0.7)" }} />
          )}
        </button>
      )}
    </>
  );
}

export default Sidebar;
