"use client"

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Ticket, FolderOpen, Building2, BarChart3, Settings, PlusCircle, Users } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Gửi Ticket", href: "/tickets/new", icon: PlusCircle },
  { name: "Danh sách Ticket", href: "/tickets", icon: Ticket },
  { name: "Danh mục phản ánh", href: "/categories", icon: FolderOpen },
  { name: "Phòng/Bộ phận", href: "/departments", icon: Building2 },
  { name: "Người dùng", href: "/users", icon: Users },
  { name: "Báo cáo SLA", href: "/reports", icon: BarChart3 },
  { name: "Cài đặt", href: "/settings", icon: Settings },
]

export function MobileNav() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Ticket className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">Helpdesk</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-sm font-medium">LC</span>
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">Lê Văn C</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
