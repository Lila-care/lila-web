import { Link, useLocation } from "wouter";
import {
  Home,
  MessageCircle,
  Calendar,
  BookOpen,
  Sprout,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import AccountBanner from "@/Chat/AccountBanner";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Hoy", href: "/hoy", icon: Home },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Diario", href: "#", icon: BookOpen, disabled: true },
  { label: "Aprende", href: "/aprende", icon: Sprout },
  { label: "Perfil", href: "/perfil", icon: UserCircle2 },
];

function Sidebar() {
  const [location] = useLocation();
  const { token, email, name, picture, logout } = useAuth();

  return (
    <aside
      data-testid="app-sidebar"
      className="hidden md:flex w-[248px] shrink-0 flex-col h-screen sticky top-0 px-5 py-8"
      style={{
        background: "linear-gradient(180deg, #FAF6F0, #F3EDF7 60%)",
        borderRight: "1px solid rgba(61,43,80,0.08)",
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
            style={{ fontFamily: "'Playfair Display', serif", color: "#9B72C8" }}
          >
            Lila
          </div>
          <div className="text-[11.5px] mt-[3px]" style={{ color: "rgba(61,43,80,0.55)" }}>
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
                key={item.label}
                data-testid={`nav-item-${item.label.toLowerCase()}`}
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
              key={item.label}
              href={item.href}
              data-testid={`nav-item-${item.label.toLowerCase()}`}
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
  );
}

export default Sidebar;
