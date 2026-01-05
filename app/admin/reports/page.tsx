"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  DoorOpen,
} from "lucide-react"
import type { Ticket as TicketType, FeedbackCategory, Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

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

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3, active: true },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

export default function ReportsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("this_month")

  const fetchData = () => {
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
      fetch(`${API_BASE}/stats/departments`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, departmentsRes, statsRes]) => {
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
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          setDepartments(mappedDepartments)
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
  }

  useEffect(() => {
    fetchData()
  }, [dateFilter])

  const stats = {
    totalTickets: tickets.length,
    openTickets: tickets.filter((t) => normalizeStatus(t.status) === "open").length,
    inProgressTickets: tickets.filter((t) => normalizeStatus(t.status) === "in_progress").length,
    resolvedTickets: tickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "resolved" || s === "closed"
    }).length,
    slaBreached: tickets.filter((t) => t.is_sla_response_breached || t.is_sla_resolution_breached).length,
  }

  const slaComplianceRate =
    stats.totalTickets > 0 ? Math.round(((stats.totalTickets - stats.slaBreached) / stats.totalTickets) * 100) : 100

  const categoryStats = categories.map((cat) => {
    const catTickets = tickets.filter((t) => t.category_id === cat.id)
    const breached = catTickets.filter((t) => t.is_sla_response_breached || t.is_sla_resolution_breached)
    return {
      category: cat,
      total: catTickets.length,
      open: catTickets.filter((t) => normalizeStatus(t.status) === "open").length,
      resolved: catTickets.filter((t) => {
        const s = normalizeStatus(t.status)
        return s === "resolved" || s === "closed"
      }).length,
      breached: breached.length,
      compliance_rate:
        catTickets.length > 0 ? Math.round(((catTickets.length - breached.length) / catTickets.length) * 100) : 100,
    }
  })

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
        <header className="sticky top-0 z-40 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Báo cáo & Thống kê</h1>
              <p className="text-sm text-muted-foreground">SLA Tracking và phân tích hiệu suất</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="this_week">Tuần này</SelectItem>
                  <SelectItem value="this_month">Tháng này</SelectItem>
                  <SelectItem value="this_quarter">Quý này</SelectItem>
                  <SelectItem value="this_year">Năm này</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => {
                const csvContent = [
                  ['Danh mục', 'Tổng ticket', 'Đang chờ', 'Đã xử lý', 'Vi phạm SLA', 'Tỷ lệ tuân thủ'].join(','),
                  ...categoryStats.map(cat => [
                    cat.category.name,
                    cat.total,
                    cat.open,
                    cat.resolved,
                    cat.breached,
                    `${cat.compliance_rate}%`
                  ].join(','))
                ].join('\n')
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `bao-cao-${new Date().toISOString().split('T')[0]}.csv`
                link.click()
                URL.revokeObjectURL(url)
              }}>
                <Download className="w-4 h-4 mr-2" />
                Xuất báo cáo
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng ticket</p>
                    <p className="text-2xl font-bold">{stats.totalTickets}</p>
                  </div>
                  <div className="p-2 bg-violet-100 rounded-xl">
                    <Ticket className="w-5 h-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                    <p className="text-2xl font-bold">{stats.openTickets}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-xl">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Đang xử lý</p>
                    <p className="text-2xl font-bold">{stats.inProgressTickets}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Đã xử lý</p>
                    <p className="text-2xl font-bold">{stats.resolvedTickets}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-xl">
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
                    <p className="text-2xl font-bold text-red-600">{stats.slaBreached}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* SLA Compliance Gauge */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tỷ lệ tuân thủ SLA</CardTitle>
                <CardDescription>Tổng quan hiệu suất xử lý đúng hạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={slaComplianceRate >= 80 ? "#22c55e" : slaComplianceRate >= 60 ? "#eab308" : "#ef4444"}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${(slaComplianceRate / 100) * 440} 440`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{slaComplianceRate}%</span>
                      <span className="text-sm text-muted-foreground">Tuân thủ</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Đúng hạn</span>
                    </div>
                    <span className="font-semibold">{stats.totalTickets - stats.slaBreached}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Vi phạm</span>
                    </div>
                    <span className="font-semibold text-red-600">{stats.slaBreached}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Performance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Hiệu suất theo Phòng ban</CardTitle>
                <CardDescription>Tỷ lệ tuân thủ SLA của từng phòng ban</CardDescription>
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
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{deptName}</p>
                                <p className="text-xs text-muted-foreground">{dept.total || 0} ticket</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {dept.resolved || 0}/{dept.total || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Đã xử lý</p>
                              </div>
                              <Badge
                                className={
                                  (dept.compliance_rate || 0) >= 80
                                    ? "bg-green-100 text-green-700"
                                    : (dept.compliance_rate || 0) >= 60
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }
                              >
                                {dept.compliance_rate || 0}%
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={dept.compliance_rate || 0}
                            className={`h-2 ${(dept.compliance_rate || 0) >= 80 ? "[&>div]:bg-green-500" : (dept.compliance_rate || 0) >= 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thống kê theo Danh mục</CardTitle>
              <CardDescription>Phân tích ticket theo từng loại phản ánh</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStats.map((cat) => (
                  <div key={cat.category.id} className="p-4 border rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{cat.category.name}</h4>
                      <Badge variant="outline">{cat.category.code}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tổng ticket</span>
                        <span className="font-medium">{cat.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Đang chờ</span>
                        <span className="font-medium text-yellow-600">{cat.open}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Đã xử lý</span>
                        <span className="font-medium text-green-600">{cat.resolved}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vi phạm SLA</span>
                        <span className="font-medium text-red-600">{cat.breached}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tuân thủ SLA</span>
                          <span className="font-medium">{cat.compliance_rate}%</span>
                        </div>
                        <Progress value={cat.compliance_rate} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SLA Configuration Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cấu hình SLA theo Danh mục</CardTitle>
              <CardDescription>Thời gian cam kết phản hồi và xử lý</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Danh mục</th>
                      <th className="text-left py-3 px-4 font-medium">Phòng ban</th>
                      <th className="text-center py-3 px-4 font-medium">SLA Phản hồi</th>
                      <th className="text-center py-3 px-4 font-medium">SLA Xử lý</th>
                      <th className="text-center py-3 px-4 font-medium">Độ ưu tiên</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const dept = departments.find((d) => d.id === cat.department_id)
                      return (
                        <tr key={cat.id} className="border-b last:border-0">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              <p className="text-xs text-muted-foreground">{cat.code}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{dept?.name || "-"}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="secondary">{cat.sla_response_hours}h</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="secondary">{cat.sla_resolution_hours}h</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={
                                cat.priority_default === "critical"
                                  ? "bg-red-500"
                                  : cat.priority_default === "high"
                                    ? "bg-orange-500"
                                    : cat.priority_default === "medium"
                                      ? "bg-blue-500"
                                      : "bg-slate-500"
                              }
                            >
                              {cat.priority_default === "critical"
                                ? "Khẩn cấp"
                                : cat.priority_default === "high"
                                  ? "Cao"
                                  : cat.priority_default === "medium"
                                    ? "Trung bình"
                                    : "Thấp"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
