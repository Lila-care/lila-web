import { LogOut, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

interface AccountBannerProps {
  email: string | null;
  name: string | null;
  picture: string | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

function getInitials(source: string): string {
  const namePart = source.split("@")[0] ?? source;
  return namePart.slice(0, 2).toUpperCase();
}

function Avatar({
  name,
  email,
  picture,
}: {
  name: string | null;
  email: string | null;
  picture: string | null;
}) {
  if (picture) {
    return (
      <img
        src={picture}
        alt={name ?? email ?? "Avatar"}
        data-testid="account-avatar"
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }

  const initialsSource = name ?? email;
  return (
    <div
      data-testid="account-avatar-initials"
      className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shrink-0"
      style={{ background: "linear-gradient(135deg, #B9A3E3, #a98fdc)" }}
    >
      {initialsSource ? getInitials(initialsSource) : "?"}
    </div>
  );
}

function AccountBanner({
  email,
  name,
  picture,
  isAuthenticated,
  onLogout,
}: AccountBannerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => navigate("/login")}
        data-testid="account-banner-guest-trigger"
        className="flex items-center gap-3 w-full p-2 rounded-xl text-left transition-colors"
        style={{
          background: "#fff",
          border: "1px solid rgba(74,45,110,.06)",
          boxShadow: "0 1px 3px rgba(74,45,110,.05)",
        }}
      >
        <UserCircle size={32} className="shrink-0" color="#A79FB2" />
        <span
          className="flex-1 min-w-0 text-sm truncate"
          style={{ color: "#6B6377" }}
        >
          Guest
        </span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {isMenuOpen && (
        <div
          data-testid="account-menu"
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden"
          style={{
            background: "#fff",
            border: "1px solid rgba(74,45,110,.07)",
            boxShadow: "0 6px 20px rgba(74,45,110,.12)",
          }}
        >
          <div
            data-testid="account-menu-email"
            className="px-4 py-3 text-sm truncate"
            style={{
              color: "#6B6377",
              borderBottom: "1px solid rgba(74,45,110,.07)",
            }}
          >
            {email}
          </div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              onLogout();
            }}
            data-testid="account-logout"
            className="flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors"
            style={{ color: "#2A2530" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(185,163,227,.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        data-testid="account-banner-trigger"
        className="flex items-center gap-3 w-full p-2 rounded-xl text-left"
        style={{
          background: "#fff",
          border: "1px solid rgba(74,45,110,.06)",
          boxShadow: "0 1px 3px rgba(74,45,110,.05)",
        }}
      >
        <Avatar name={name} email={email} picture={picture} />
        <span
          data-testid="account-name"
          className="flex-1 min-w-0 text-sm font-semibold truncate"
          style={{ color: "#2A2530" }}
        >
          {name || email}
        </span>
      </button>
    </div>
  );
}

export default AccountBanner;
