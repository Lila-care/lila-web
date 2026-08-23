import type { ReactNode } from "react";
import Sidebar from "@/components/AppShell/Sidebar";
import MobileNav from "@/components/AppShell/MobileNav";

interface AppShellProps {
  children: ReactNode;
}

// Shell compartido por /today, /calendar, /learn, /profile y /profile/privacy — sidebar fijo
// en desktop (>=768px), menú hamburguesa en mobile. /chat usa su propio layout (rail de
// conversaciones adicional) pero también monta <Sidebar /> para el nav principal.
function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#FAF6F0", color: "#3D2B50" }}
    >
      <Sidebar />
      <MobileNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default AppShell;
