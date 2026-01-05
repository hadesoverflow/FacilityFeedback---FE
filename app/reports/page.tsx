"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { StatsCard } from "@/components/dashboard/stats-card"
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, Download } from "lucide-react"
import type { Ticket, FeedbackCategory } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function mapTicketFromApi(api: any): Ticket {
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

export default function ReportsPage() {
  const [period, setPeriod] = useState("month")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
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
      fetch(`${API_BASE}/stats/departments`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, statsRes]) => {
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
          setTickets(mappedTickets)
          setCategories(mappedCategories)
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

  const totalTickets = tickets.length
  const resolvedTickets = tickets.filter((t) => {
    const s = normalizeStatus(t.status)
    return s === "resolved" || s === "closed"
  }).length
  const breachedTickets = tickets.filter((t) => t.is_sla_resolution_breached).length
  const slaCompliance = totalTickets > 0 ? Math.round(((totalTickets - breachedTickets) / totalTickets) * 100) : 100

  const statusData = [
    { name: "Mở", value: tickets.filter((t) => normalizeStatus(t.status) === "open").length },
    {
      name: "Đang xử lý",
      value: tickets.filter((t) => normalizeStatus(t.status) === "in_progress").length,
    },
    {
      name: "Đã giải quyết",
      value: tickets.filter((t) => normalizeStatus(t.status) === "resolved").length,
    },
    {
      name: "Đã đóng",
      value: tickets.filter((t) => normalizeStatus(t.status) === "closed").length,
    },
  ]

  const categoryData = categories.map((cat) => ({
    name: cat.code,
    total: tickets.filter((t) => t.category_id === cat.id).length,
  }))

  const COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#6b7280"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Báo cáo SLA</h1>
          <p className="text-muted-foreground">Thống kê và phân tích hiệu suất xử lý ticket</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tổng Ticket"
          value={totalTickets}
          icon={BarChart3}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatsCard
          title="Đã giải quyết"
          value={resolvedTickets}
          description={`${Math.round((resolvedTickets / totalTickets) * 100)}% tổng số`}
          icon={CheckCircle}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatsCard
          title="Tỉ lệ SLA đạt"
          value={`${slaCompliance}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatsCard
          title="Vi phạm SLA"
          value={breachedTickets}
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phân bố trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            SLA theo phòng ban
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {departmentStats.map((stat) => (
              <div key={stat.department.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stat.department.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.total} ticket | {stat.resolved} đã xử lý | {stat.breached} vi phạm
                    </p>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      stat.compliance_rate >= 90
                        ? "text-green-600"
                        : stat.compliance_rate >= 70
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {stat.compliance_rate}%
                  </span>
                </div>
                <Progress value={stat.compliance_rate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thời gian phản hồi trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.slice(0, 5).map((cat) => {
                // Calculate average response time from tickets
                const categoryTickets = tickets.filter((t) => t.category_id === cat.id && t.first_response_at)
                const avgResponseTime = categoryTickets.length > 0
                  ? categoryTickets.reduce((sum, t) => {
                      const created = new Date(t.created_at).getTime()
                      const firstResponse = new Date(t.first_response_at!).getTime()
                      return sum + (firstResponse - created) / (1000 * 60 * 60) // hours
                    }, 0) / categoryTickets.length
                  : 0

                return (
                <div key={cat.id} className="flex items-center justify-between">
                  <span className="text-sm">{cat.name}</span>
                  <div className="flex items-center gap-2">
                      <span className="font-medium">{avgResponseTime.toFixed(1)}h</span>
                    <span className="text-xs text-muted-foreground">/ {cat.sla_response_hours}h</span>
                  </div>
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thời gian xử lý trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.slice(0, 5).map((cat) => {
                // Calculate average resolution time from tickets
                const categoryTickets = tickets.filter((t) => t.category_id === cat.id && t.resolved_at)
                const avgResolutionTime = categoryTickets.length > 0
                  ? categoryTickets.reduce((sum, t) => {
                      const created = new Date(t.created_at).getTime()
                      const resolved = new Date(t.resolved_at!).getTime()
                      return sum + (resolved - created) / (1000 * 60 * 60) // hours
                    }, 0) / categoryTickets.length
                  : 0

                return (
                <div key={cat.id} className="flex items-center justify-between">
                  <span className="text-sm">{cat.name}</span>
                  <div className="flex items-center gap-2">
                      <span className="font-medium">{avgResolutionTime.toFixed(1)}h</span>
                    <span className="text-xs text-muted-foreground">/ {cat.sla_resolution_hours}h</span>
                  </div>
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
