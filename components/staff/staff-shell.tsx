"use client"

import type React from "react"

import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ClipboardList, LayoutDashboard, Calendar, MessageSquare, TrendingUp, LogOut } from "lucide-react"
import type { Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const navigation = [
  { name: "Tổng quan", href: "/staff", icon: LayoutDashboard },
  { name: "Nhiệm vụ", href: "/staff/tasks", icon: ClipboardList },
  { name: "Lịch làm việc", href: "/staff/calendar", icon: Calendar },
  { name: "Tin nhắn", href: "/staff/messages", icon: MessageSquare },
  { name: "Thống kê", href: "/staff/stats", icon: TrendingUp },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/staff") return pathname === "/staff"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function StaffShell({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string
  subtitle?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const initials =
    user?.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "NV"

  const departmentName = user?.department_id
    ? (user.department as Department | undefined)?.name || ""
    : undefined

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 text-white lg:flex">
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500 p-2">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Helpdesk</h1>
              <p className="text-xs text-slate-400">Staff Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href)
            return (
              <Button
                key={item.name}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  active
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Link to={item.href}>
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-blue-500">
              <AvatarFallback className="bg-blue-500 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.full_name || "Nhân viên"}</p>
              <p className="truncate text-xs text-slate-400">{departmentName || "Staff"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-3">{headerRight}</div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
