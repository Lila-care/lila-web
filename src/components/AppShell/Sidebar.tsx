import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  MessageCircle,
  Calendar,
  BookOpen,
  User,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

// nav-item-aprende usa el ícono book-open en Figma (no Sprout, como en el Sidebar anterior).
const NAV_ITEMS: NavItem[] = [
  { label: "Hoy", href: "/hoy", icon: Home },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Aprende", href: "/aprende", icon: BookOpen },
];

function getInitials(source: string): string {
  const namePart = source.split("@")[0] ?? source;
  return namePart.slice(0, 2).toUpperCase();
}

function Sidebar() {
  const [location, navigate] = useLocation();
  const { token, email, name, picture, logout } = useAuth();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const popoverId = useId();
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isPopoverOpen) return;

    firstItemRef.current?.focus();

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopoverOpen]);

  const handleTriggerClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setIsPopoverOpen((v) => !v);
  };

  const initialsSource = name ?? email;

  return (
    <aside
      data-testid="app-sidebar"
      ref={containerRef}
      className="hidden md:flex relative z-20 w-[72px] shrink-0 flex-col items-center justify-between h-screen sticky top-0 py-6 border-r border-solid"
      style={{
        background: "var(--nav-background)",
        borderColor: "var(--brand-primary-dark)",
      }}
    >
      {/* brand-logo-group */}
      <div className="flex flex-col items-center gap-1">
        <img
          src="/sello_vinotinto.svg"
          alt=""
          className="size-[44px] object-contain"
        />
        <p
          className="font-bold text-xs"
          style={{ color: "var(--text-on-brand)" }}
        >
          Lila
        </p>
      </div>

      {/* nav-icons */}
      <nav className="flex flex-col gap-4" data-testid="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              data-testid={`nav-item-${item.label.toLowerCase()}`}
              className="flex flex-col items-center justify-center rounded-[14px] size-[48px] transition-colors"
              style={{
                background: isActive
                  ? "var(--brand-primary)"
                  : "var(--nav-icon-default)",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} color="var(--text-on-brand)" />
            </Link>
          );
        })}
      </nav>

      {/* user-avatar-trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        data-testid="user-avatar-trigger"
        aria-label={isAuthenticated ? "Menú de cuenta" : "Iniciar sesión"}
        aria-haspopup={isAuthenticated ? "menu" : undefined}
        aria-expanded={isAuthenticated ? isPopoverOpen : undefined}
        aria-controls={isPopoverOpen ? popoverId : undefined}
        className="flex flex-col items-center justify-center rounded-full size-[48px] border-2 border-solid overflow-hidden"
        style={{
          borderColor: isAuthenticated
            ? "var(--brand-accent)"
            : "var(--nav-icon-default)",
          background: "var(--nav-icon-default)",
        }}
      >
        {isAuthenticated && picture ? (
          <img
            src={picture}
            alt={name ?? email ?? "Avatar"}
            data-testid="account-avatar"
            className="size-full object-cover"
          />
        ) : isAuthenticated ? (
          <span
            data-testid="account-avatar-initials"
            className="text-xs font-semibold"
            style={{ color: "var(--text-on-brand)" }}
          >
            {initialsSource ? getInitials(initialsSource) : "?"}
          </span>
        ) : (
          <UserRound size={20} color="var(--text-on-brand)" />
        )}
      </button>

      {/* user-popover */}
      {isPopoverOpen && isAuthenticated && (
        <div
          id={popoverId}
          role="menu"
          aria-label="Menú de cuenta"
          data-testid="user-popover"
          className="absolute bottom-6 left-[80px] z-50 w-[260px] flex flex-col gap-3 p-4 rounded-[20px] border border-solid"
          style={{
            background: "var(--surface-default)",
            borderColor: "var(--border-default)",
            boxShadow: "4px -4px 10px rgba(31,41,55,0.1)",
          }}
        >
          <div className="flex items-center gap-3 w-full">
            <div
              className="size-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: "var(--surface-muted)" }}
            >
              {picture ? (
                <img src={picture} alt="" className="size-full object-cover" />
              ) : (
                <UserRound size={18} color="var(--brand-primary)" />
              )}
            </div>
            <div
              className="flex flex-col gap-0.5 min-w-0"
              style={{ color: "var(--text-secondary)" }}
            >
              <p
                data-testid="account-name"
                className="text-sm font-bold truncate"
              >
                {name || email}
              </p>
              <p className="text-[11px] truncate">{email}</p>
            </div>
          </div>

          <div
            className="h-px w-full"
            style={{ background: "var(--border-default)" }}
          />

          <div className="flex flex-col gap-0.5 w-full">
            <Link
              ref={firstItemRef}
              href="/perfil"
              role="menuitem"
              onClick={() => setIsPopoverOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-lg text-[13px]"
              style={{ color: "var(--brand-primary)" }}
            >
              <User size={16} />
              Mi Perfil
            </Link>
            <Link
              href="/calendario"
              role="menuitem"
              onClick={() => setIsPopoverOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-lg text-[13px]"
              style={{ color: "var(--brand-primary)" }}
            >
              <Calendar size={16} />
              Calendario Menstrual
            </Link>
            <span
              data-testid="popover-item-diario"
              role="menuitem"
              aria-disabled="true"
              tabIndex={-1}
              title="Próximamente"
              className="flex items-center gap-2.5 p-2 rounded-lg text-[13px] cursor-not-allowed opacity-70"
              style={{ color: "var(--brand-primary)" }}
            >
              <BookOpen size={16} />
              <span className="flex-1">Diario Emocional</span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--brand-primary)",
                }}
              >
                Pronto
              </span>
            </span>
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setIsPopoverOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-lg text-[13px]"
              style={{ color: "var(--brand-primary)" }}
            >
              <Settings size={16} />
              Configuración
            </Link>
          </div>

          <div
            className="h-px w-full"
            style={{ background: "var(--border-default)" }}
          />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsPopoverOpen(false);
              logout();
            }}
            className="flex items-center gap-2.5 p-2 rounded-lg text-[13px] font-semibold w-full text-left"
            style={{ color: "var(--brand-primary)" }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
