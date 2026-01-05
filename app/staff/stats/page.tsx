"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { parseISO, differenceInHours, format, subDays, startOfDay, isSameDay } from "date-fns"
import { vi } from "date-fns/locale"
import * as RechartsPrimitive from "recharts"
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react"

import { StaffShell } from "@/components/staff/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { Ticket, FeedbackCategory } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function safeHoursDiff(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  try {
    return differenceInHours(parseISO(end), parseISO(start))
  } catch {
    return null
  }
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K) {
  const out: Record<string, T[]> = {}
  for (const item of items) {
    const k = keyFn(item)
    out[k] ||= []
    out[k].push(item)
  }
  return out as Record<K, T[]>
}

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
      status: api.status,
      priority: api.priority,
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
    return status.toLowerCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase()
  }
  return "open"
}

export default function StaffStatsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
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
      .then(([ticketsRes, categoriesRes]) => {
        try {
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
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [user])

  const myTickets = useMemo(() => tickets, [tickets])

  const stats = useMemo(() => {
    const assigned = myTickets.length
    const pending = myTickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "open" || s === "in_progress"
    }).length
    const completed = myTickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "resolved" || s === "closed"
    }).length
    const slaBreached = myTickets.filter((t) => t.is_sla_response_breached || t.is_sla_resolution_breached).length

    const resolutionHours = myTickets
      .map((t) => safeHoursDiff(t.created_at, t.resolved_at))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    const avgResolution = resolutionHours.length ? Math.round(resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) : 0

    return { assigned, pending, completed, slaBreached, avgResolution }
  }, [myTickets])

  const statusData = useMemo(() => {
    const byStatus = groupBy(myTickets, (t) => normalizeStatus(t.status))
    const labels: Record<string, string> = {
      open: "Mở",
      in_progress: "Đang xử lý",
      resolved: "Đã giải quyết",
      closed: "Đã đóng",
    }
    return Object.entries(byStatus).map(([status, list]) => ({
      status,
      label: labels[status] || status,
      count: list.length,
    }))
  }, [myTickets])

  const dailyResolved = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)))
    const resolvedTickets = myTickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return (s === "resolved" || s === "closed") && t.resolved_at
    })
    return days.map((day) => ({
      day: format(day, "dd/MM", { locale: vi }),
      resolved: resolvedTickets.filter((t) => t.resolved_at && isSameDay(parseISO(t.resolved_at), day)).length,
    }))
  }, [myTickets])

  const categoryTop = useMemo(() => {
    const byCategory = groupBy(myTickets, (t) => t.category_id)
    return Object.entries(byCategory)
      .map(([categoryId, list]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return { category: cat?.name || "Khác", count: list.length }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [myTickets, categories])

  const statusChartConfig = {
    count: { label: "Số lượng", color: "hsl(var(--primary))" },
  } satisfies ChartConfig

  const resolvedChartConfig = {
    resolved: { label: "Đã xong", color: "hsl(142 72% 29%)" },
  } satisfies ChartConfig

  return (
    <StaffShell title="Thống kê" subtitle="Hiệu suất xử lý ticket và tình trạng SLA">
      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Được giao</p>
                <p className="text-2xl font-bold">{stats.assigned}</p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
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
              <div className="rounded-xl bg-amber-100 p-3">
                <Clock className="h-5 w-5 text-amber-700" />
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
              <div className="rounded-xl bg-green-100 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
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
              <div className="rounded-xl bg-red-100 p-3">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Theo trạng thái</CardTitle>
              <Badge variant="secondary">TB xử lý: ~{stats.avgResolution}h</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="h-[280px] w-full">
              <RechartsPrimitive.BarChart data={statusData} margin={{ left: 0, right: 12, top: 10, bottom: 10 }}>
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
                <RechartsPrimitive.YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsPrimitive.Tooltip content={<ChartTooltipContent />} />
                <RechartsPrimitive.Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
              </RechartsPrimitive.BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Top danh mục</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              categoryTop.map((row) => (
                <div key={row.category} className="flex items-center justify-between gap-2 rounded-lg border bg-white p-3">
                  <p className="truncate text-sm font-medium">{row.category}</p>
                  <Badge className="bg-blue-600">{row.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Hoàn thành 7 ngày gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={resolvedChartConfig} className="h-[280px] w-full">
              <RechartsPrimitive.LineChart data={dailyResolved} margin={{ left: 0, right: 12, top: 10, bottom: 10 }}>
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis dataKey="day" tickLine={false} axisLine={false} interval={0} />
                <RechartsPrimitive.YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsPrimitive.Tooltip content={<ChartTooltipContent />} />
                <RechartsPrimitive.Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="var(--color-resolved)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </RechartsPrimitive.LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTickets.slice(0, 6).map((t: Ticket) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.ticket_number}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.title}</p>
                </div>
                <Badge
                  className={
                    t.status === "resolved" || t.status === "closed"
                      ? "bg-green-600"
                      : t.status === "in_progress"
                        ? "bg-blue-600"
                        : "bg-amber-600"
                  }
                >
                  {t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  )
}

