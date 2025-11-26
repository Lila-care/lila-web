// src/layouts/AdminLayout.tsx
import { ReactNode } from "react"
import { Bell, User } from "lucide-react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* TOP NAVBAR */}
      <header className="bg-primary border-b h-16 flex items-center px-6 justify-between shadow-sm">
        {/* Logo */}
        <div className="text-xl font-bold text-white">Lila Admin</div>

        {/* Navigation */}
        <nav className="flex gap-6">
          <a href="/admin" className="hover:text-accent text-white">Dashboard</a>
          <a href="/admin/users" className="hover:text-accent text-white">Users</a>
          <a href="/admin/reports" className="hover:text-accent text-white">Reports</a>
        </nav>

        {/* Icons Right */}
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-white cursor-pointer" />
          <User className="w-6 h-6 text-white cursor-pointer" />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-0">{children}</main>
    </div>
  )
}
