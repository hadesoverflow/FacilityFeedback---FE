"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationDropdown } from "@/components/staff/notification-dropdown"
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Search,
  Filter,
  ChevronRight,
  Play,
  Pause,
  Timer,
  TrendingUp,
  Building2,
  Calendar,
  MessageSquare,
} from "lucide-react"
import type { Ticket, FeedbackCategory } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function mapTicketFromApi(api: any): Ticket | null {
  try {
    if (!api || !api.id) return null
    return {
      id: String(api.id),
      ticket_number: api.ticketNumber || "",
      title: api.title || "",
      description: api.description || "",
      category_id: String(api.categoryId || ""),
      department_id: String(api.departmentId || ""),
      status: normalizeStatus(api.status),
      priority: api.priority ? api.priority.toLowerCase() : "medium",
      reporter_id: String(api.reporterId || ""),
      assignee_id: api.assigneeId ? String(api.assigneeId) : undefined,
      location: api.location || "",
      attachment_urls: api.attachmentUrls,
      sla_response_due: api.slaResponseDue,
      sla_resolution_due: api.slaResolutionDue,
      first_response_at: api.firstResponseAt,
      resolved_at: api.resolvedAt,
      closed_at: api.closedAt,
      is_sla_response_breached: api.isSlaResponseBreached || false,
      is_sla_resolution_breached: api.isSlaResolutionBreached || false,
      created_at: api.createdAt || new Date().toISOString(),
      updated_at: api.updatedAt || new Date().toISOString(),
      category: api.category,
      department: api.department,
      reporter: api.reporter,
      assignee: api.assignee,
    }
  } catch (err) {
    console.error("Error mapping ticket:", err, api)
    return null
  }
}

function normalizeStatus(status: any): string {
  if (typeof status === "number") {
    const statusMap: Record<number, string> = { 0: "open", 1: "in_progress", 2: "resolved", 3: "closed" }
    return statusMap[status] || "open"
  }
  if (typeof status === "string") {
    const normalized = status
      // Convert camelCase to snake_case: "inProgress" -> "in_Progress"
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      // Convert to lowercase
      .toLowerCase()
    // Map known status values
    const statusMap: Record<string, string> = {
      "open": "open",
      "inprogress": "in_progress",
      "in_progress": "in_progress",
      "resolved": "resolved",
      "closed": "closed",
    }
    return statusMap[normalized] || "open"
  }
  return "open"
}

const navigation = [
  { name: "Tổng quan", href: "/staff", icon: LayoutDashboard },
  { name: "Nhiệm vụ", href: "/staff/tasks", icon: ClipboardList },
  { name: "Lịch làm việc", href: "/staff/calendar", icon: Calendar },
  { name: "Tin nhắn", href: "/staff/messages", icon: MessageSquare },
  { name: "Thống kê", href: "/staff/stats", icon: TrendingUp },
]

const statusConfig = {
  open: { label: "Chờ xử lý", color: "bg-yellow-500", textColor: "text-yellow-600", bgLight: "bg-yellow-50" },
  in_progress: { label: "Đang xử lý", color: "bg-blue-500", textColor: "text-blue-600", bgLight: "bg-blue-50" },
  resolved: { label: "Đã xử lý", color: "bg-green-500", textColor: "text-green-600", bgLight: "bg-green-50" },
  closed: { label: "Đã đóng", color: "bg-slate-500", textColor: "text-slate-600", bgLight: "bg-slate-50" },
}

const priorityConfig = {
  low: { label: "Thấp", color: "bg-slate-500" },
  medium: { label: "Trung bình", color: "bg-blue-500" },
  high: { label: "Cao", color: "bg-orange-500" },
  critical: { label: "Khẩn cấp", color: "bg-red-500" },
}

export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [activeTab, setActiveTab] = useState("assigned")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true)
        const [ticketsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/tickets?assigneeId=${user.id}`)
        .then(async (r) => {
          if (!r.ok) return []
          const data = await r.json().catch(() => [])
          return Array.isArray(data) ? data : []
        })
        .catch(() => []),
      fetch(`${API_BASE}/categories`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])

          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes.map(mapTicketFromApi).filter((t): t is Ticket => t !== null)
            : []
          const mappedCategories = Array.isArray(categoriesRes)
            ? categoriesRes.map((c: any) => ({
                id: String(c.id),
                name: c.name,
                code: c.code,
                description: c.description,
                department_id: String(c.departmentId),
                sla_response_hours: c.slaResponseHours,
                sla_resolution_hours: c.slaResolutionHours,
                priority_default: c.priorityDefault,
                is_active: c.isActive,
                created_at: c.createdAt,
                updated_at: c.updatedAt,
              }))
            : []
          setTickets(mappedTickets)
          setCategories(mappedCategories)
        } catch (err) {
          console.error("Error mapping data:", err)
        } finally {
        if (showLoading) setLoading(false)
        }
    }

    // Initial load
    fetchData(true)

    // Auto-refresh every 5 seconds to get updates
    const interval = setInterval(() => {
      fetchData(false)
    }, 5000)

    // Also refresh when window regains focus
    const handleFocus = () => {
      fetchData(false)
    }
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user])

  // Filter tickets assigned to current staff user
  const assignedTickets = tickets
  const pendingTickets = assignedTickets.filter((t) => {
    const s = normalizeStatus(t.status)
    return s === "open" || s === "in_progress"
  })
  const completedTickets = assignedTickets.filter((t) => {
    const s = normalizeStatus(t.status)
    return s === "resolved" || s === "closed"
  })

  const stats = {
    assigned: assignedTickets.length,
    pending: pendingTickets.length,
    completed: completedTickets.length,
    slaAtRisk: assignedTickets.filter((t) => t.is_sla_resolution_breached || t.is_sla_response_breached).length,
  }

  const completionRate = stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleStartTask = async (ticket: Ticket) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "InProgress" }),
      })
      if (response.ok) {
        const updated = await response.json()
        const mapped = mapTicketFromApi(updated)
        if (mapped) {
          setTickets(tickets.map((t) => (t.id === ticket.id ? mapped : t)))
        }
      }
    } catch (error) {
      console.error("Error starting task:", error)
    }
  }

  const handleCompleteTask = async (ticket: Ticket) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      })
      if (response.ok) {
        const updated = await response.json()
        const mapped = mapTicketFromApi(updated)
        if (mapped) {
          setTickets(tickets.map((t) => (t.id === ticket.id ? mapped : t)))
        }
      }
    } catch (error) {
      console.error("Error completing task:", error)
    }
  }

  const filteredTickets = activeTab === "assigned" ? pendingTickets : completedTickets

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Helpdesk</h1>
              <p className="text-xs text-slate-400">Staff Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const active = item.href === "/staff" ? pathname === "/staff" : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Button
                key={item.name}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={`w-full justify-start ${active ? "bg-slate-800 hover:bg-slate-700 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}
              >
                <Link to={item.href}>
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-blue-500">
              <AvatarFallback className="bg-blue-500 text-white">TB</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.full_name || "Nhân viên"}</p>
              <p className="text-xs text-slate-400">Phòng CSVC</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Staff Portal</span>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold">Nhiệm vụ của tôi</h1>
              <p className="text-sm text-muted-foreground">Quản lý và xử lý các ticket được giao</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Tìm kiếm ticket..." className="pl-9 w-64" />
              </div>
              <NotificationDropdown />
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Được giao</p>
                    <p className="text-2xl font-bold">{stats.assigned}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Đang xử lý</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hoàn thành</p>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vi phạm SLA</p>
                    <p className="text-2xl font-bold text-red-600">{stats.slaAtRisk}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hiệu suất làm việc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tỷ lệ hoàn thành</span>
                    <span className="text-sm font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">/{stats.assigned} ticket</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="assigned" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Đang xử lý
                      <Badge variant="secondary" className="ml-1">
                        {stats.pending}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn thành
                      <Badge variant="secondary" className="ml-1">
                        {stats.completed}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Lọc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="open">Chờ xử lý</SelectItem>
                    <SelectItem value="in_progress">Đang xử lý</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status]
                  const priority = priorityConfig[ticket.priority]
                  const category = categories.find((c) => c.id === ticket.category_id)
                  const isSlaBreached = ticket.is_sla_resolution_breached || ticket.is_sla_response_breached

                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-xl border ${isSlaBreached ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"} hover:shadow-md transition-all cursor-pointer group`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${status.bgLight}`}>
                          {ticket.status === "in_progress" ? (
                            <Play className={`w-5 h-5 ${status.textColor}`} />
                          ) : (
                            <Pause className={`w-5 h-5 ${status.textColor}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                            <Badge className={`${priority.color} text-white text-xs`}>{priority.label}</Badge>
                            {isSlaBreached && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                SLA
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-900 truncate">{ticket.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {ticket.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {category?.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ticket.status === "open" && (
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartTask(ticket)
                              }}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Bắt đầu
                            </Button>
                          )}
                          {ticket.status === "in_progress" && (
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCompleteTask(ticket)
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Hoàn thành
                            </Button>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredTickets.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">Không có ticket nào</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "assigned" ? "Bạn đã hoàn thành tất cả nhiệm vụ!" : "Chưa có ticket hoàn thành"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
