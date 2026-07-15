import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Home, MessageCircle, Calendar, BookOpen, Sprout, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Menú hamburguesa para viewports < md (768px) — el Sidebar fijo se oculta con `hidden md:flex`.
function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        data-testid="mobile-nav-toggle"
        className="fixed top-4 right-4 z-30 p-2 rounded-lg bg-white/90 shadow-sm"
        style={{ color: "#3D2B50" }}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav
        data-testid="mobile-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 max-w-[80vw] px-5 py-8 transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "#FAF6F0" }}
      >
        <div className="flex items-center gap-2.5 px-2 pb-7">
          <img
            src="/sello_vinotinto.svg"
            alt="Lila"
            className="w-[34px] h-[34px] object-contain shrink-0"
          />
          <div
            className="italic font-bold text-xl leading-none"
            style={{ fontFamily: "'Playfair Display', serif", color: "#9B72C8" }}
          >
            Lila
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <span
                  key={item.label}
                  data-testid={`mobile-nav-item-${item.label.toLowerCase()}`}
                  title="Próximamente"
                  aria-disabled="true"
                  className="flex items-center gap-3 px-3.5 py-[11px] rounded-xl text-[14.5px] font-medium cursor-not-allowed opacity-50"
                  style={{ color: "rgba(61,43,80,0.7)" }}
                >
                  <Icon size={19} />
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                data-testid={`mobile-nav-item-${item.label.toLowerCase()}`}
                className="flex items-center gap-3 px-3.5 py-[11px] rounded-xl text-[14.5px] font-medium"
                style={
                  isActive
                    ? { background: "#9B72C8", color: "#fff", fontWeight: 600 }
                    : { color: "rgba(61,43,80,0.7)" }
                }
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default MobileNav;
