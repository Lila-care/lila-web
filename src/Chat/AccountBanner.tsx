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
      className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold shrink-0"
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
        className="flex items-center gap-3 w-full px-4 py-3 bg-white border-t border-gray-100 text-left hover:bg-secondary transition"
      >
        <UserCircle size={32} className="text-gray-400 shrink-0" />
        <span className="flex-1 min-w-0 text-sm text-gray-500 truncate">
          Guest
        </span>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative px-4 py-3 bg-white border-t border-gray-100"
    >
      {isMenuOpen && (
        <div
          data-testid="account-menu"
          className="absolute bottom-full left-4 right-4 mb-2 rounded-lg border border-gray-100 bg-white shadow-lg overflow-hidden"
        >
          <div
            data-testid="account-menu-email"
            className="px-4 py-3 text-sm text-gray-500 truncate border-b border-gray-100"
          >
            {email}
          </div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              onLogout();
            }}
            data-testid="account-logout"
            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-secondary transition"
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
        className="flex items-center gap-3 w-full text-left"
      >
        <Avatar name={name} email={email} picture={picture} />
        <span
          data-testid="account-name"
          className="flex-1 min-w-0 text-sm text-gray-700 truncate"
        >
          {name || email}
        </span>
      </button>
    </div>
  );
}

export default AccountBanner;
