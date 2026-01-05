"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  Building2,
  Users,
  BarChart3,
  CalendarDays,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Plus,
  ArrowUpRight,
  DoorOpen,
} from "lucide-react"
import type { Ticket as TicketType, FeedbackCategory, Department, User } from "@/types/database"
import { NotificationBell } from "@/components/NotificationBell"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, active: true },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

function getStatusColor(status: any): string {
  const normalized = normalizeStatus(status)
  const colorMap: Record<string, string> = {
    open: "bg-yellow-500",
    in_progress: "bg-blue-500",
    resolved: "bg-green-500",
    closed: "bg-slate-500",
  }
  return colorMap[normalized] || "bg-slate-500"
}

function mapTicketFromApi(api: any): TicketType {
  return {
    id: String(api.id),
    ticket_number: api.ticketNumber,
    title: api.title,
    description: api.description,
    category_id: String(api.categoryId),
    department_id: String(api.departmentId),
    status: api.status,
    priority: api.priority,
    reporter_id: String(api.reporterId),
    assignee_id: api.assigneeId ? String(api.assigneeId) : undefined,
    location: api.location,
    attachment_urls: api.attachmentUrls,
    sla_response_due: api.slaResponseDue,
    sla_resolution_due: api.slaResolutionDue,
    first_response_at: api.firstResponseAt,
    resolved_at: api.resolvedAt,
    closed_at: api.closedAt,
    is_sla_response_breached: api.isSlaResponseBreached,
    is_sla_resolution_breached: api.isSlaResolutionBreached,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
    category: api.category,
    department: api.department,
    reporter: api.reporter,
    assignee: api.assignee,
  }
}

function normalizeStatus(status: any): string {
  if (typeof status === "number") {
    const statusMap: Record<number, string> = { 0: "open", 1: "in_progress", 2: "resolved", 3: "closed" }
    return statusMap[status] || "open"
  }
  if (typeof status === "string") {
    return status.toLowerCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase()
  }
  return "open"
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/tickets`)
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
      fetch(`${API_BASE}/departments`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
      fetch(`${API_BASE}/users`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
      fetch(`${API_BASE}/stats/departments`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, departmentsRes, usersRes, statsRes]) => {
        try {
          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes.map(mapTicketFromApi).filter(Boolean)
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
          const mappedDepartments = Array.isArray(departmentsRes)
            ? departmentsRes.map((d: any) => ({
                id: String(d.id),
                name: d.name,
                code: d.code,
                description: d.description,
                manager_id: d.managerId ? String(d.managerId) : undefined,
                created_at: d.createdAt,
                updated_at: d.updatedAt,
              }))
            : []
          const mappedUsers = Array.isArray(usersRes)
            ? usersRes.map((u: any) => ({
                id: String(u.id),
                email: u.email,
                full_name: u.fullName,
                role: u.role,
                department_id: u.departmentId ? String(u.departmentId) : undefined,
                created_at: u.createdAt,
                updated_at: u.updatedAt,
              }))
            : []
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          setDepartments(mappedDepartments)
          setUsers(mappedUsers)
          setDepartmentStats(Array.isArray(statsRes) ? statsRes : [])
        } catch (err) {
          console.error("Error mapping data:", err)
        } finally {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [])

  const stats = {
    totalTickets: tickets.length,
    openTickets: tickets.filter((t) => normalizeStatus(t.status) === "open").length,
    inProgressTickets: tickets.filter((t) => normalizeStatus(t.status) === "in_progress").length,
    resolvedTickets: tickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "resolved" || s === "closed"
    }).length,
    slaBreached: tickets.filter((t) => t.is_sla_resolution_breached).length,
    totalUsers: users.length,
    totalDepartments: departments.length,
    totalCategories: categories.length,
  }

  const slaComplianceRate =
    stats.totalTickets > 0 ? Math.round(((stats.totalTickets - stats.slaBreached) / stats.totalTickets) * 100) : 100

  const recentTickets = tickets
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r hidden lg:flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Helpdesk</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-violet-100 text-violet-700">LC</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.full_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground">Quản trị viên</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
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
              <div className="p-2 bg-violet-500 rounded-xl">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Admin Panel</span>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Tổng quan hệ thống Helpdesk</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Tìm kiếm..." className="pl-9 w-64" />
              </div>
              <NotificationBell />
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                Tạo ticket
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng Ticket</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalTickets}</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12% tuần này</span>
                    </div>
                  </div>
                  <div className="p-3 bg-violet-100 rounded-2xl">
                    <Ticket className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                    <p className="text-3xl font-bold mt-1">{stats.openTickets}</p>
                    <div className="flex items-center gap-1 mt-2 text-yellow-600 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Cần xử lý ngay</span>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-2xl">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Đã xử lý</p>
                    <p className="text-3xl font-bold mt-1">{stats.resolvedTickets}</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hoàn thành tốt</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vi phạm SLA</p>
                    <p className="text-3xl font-bold mt-1 text-red-600">{stats.slaBreached}</p>
                    <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                      <TrendingDown className="w-4 h-4" />
                      <span>Cần cải thiện</span>
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-2xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* SLA Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tỷ lệ tuân thủ SLA</CardTitle>
                <CardDescription>Hiệu suất xử lý ticket đúng hạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="72" cy="72" r="60" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        fill="none"
                        stroke={slaComplianceRate >= 80 ? "#22c55e" : slaComplianceRate >= 60 ? "#eab308" : "#ef4444"}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(slaComplianceRate / 100) * 377} 377`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{slaComplianceRate}%</span>
                      <span className="text-xs text-muted-foreground">Tuân thủ</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Đúng hạn</span>
                    <span className="font-medium">{stats.totalTickets - stats.slaBreached} ticket</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vi phạm</span>
                    <span className="font-medium text-red-600">{stats.slaBreached} ticket</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Hiệu suất theo phòng ban</CardTitle>
                    <CardDescription>Tỷ lệ xử lý ticket của từng phòng</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Xem chi tiết
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : departmentStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</div>
                ) : (
                  <div className="space-y-4">
                    {departmentStats.map((dept: any) => {
                      const deptInfo = dept.department || dept
                      const deptId = deptInfo.id || deptInfo.Id
                      const deptName = deptInfo.name || deptInfo.Name
                      return (
                        <div key={deptId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-slate-600" />
                              </div>
                              <span className="font-medium text-sm">{deptName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{dept.total || 0} ticket</span>
                              <Badge
                                variant="outline"
                                className={
                                  (dept.compliance_rate || 0) >= 80
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : (dept.compliance_rate || 0) >= 60
                                      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                      : "border-red-200 bg-red-50 text-red-700"
                                }
                              >
                                {dept.compliance_rate || 0}%
                              </Badge>
                            </div>
                          </div>
                          <Progress value={dept.compliance_rate || 0} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Tickets & Quick Stats */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Tickets */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Ticket gần đây</CardTitle>
                    <CardDescription>Các ticket mới nhất trong hệ thống</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Xem tất cả
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : recentTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Chưa có ticket nào</div>
                ) : (
                  <div className="space-y-3">
                    {recentTickets.map((ticket) => {
                      const category = categories.find((c) => c.id === ticket.category_id)

                      return (
                        <div
                          key={ticket.id}
                          className="flex items-center gap-4 p-3 rounded-xl border hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {category?.name || "N/A"} • {ticket.location || "N/A"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {ticket.ticket_number}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thống kê hệ thống</CardTitle>
                <CardDescription>Tổng quan dữ liệu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm">Người dùng</span>
                  </div>
                  <span className="font-semibold">{stats.totalUsers}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <Building2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-sm">Phòng ban</span>
                  </div>
                  <span className="font-semibold">{stats.totalDepartments}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FolderOpen className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm">Danh mục</span>
                  </div>
                  <span className="font-semibold">{stats.totalCategories}</span>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Phân bố ticket</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm flex-1">Chờ xử lý</span>
                      <span className="text-sm font-medium">{stats.openTickets}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm flex-1">Đang xử lý</span>
                      <span className="text-sm font-medium">{stats.inProgressTickets}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm flex-1">Đã xử lý</span>
                      <span className="text-sm font-medium">{stats.resolvedTickets}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
