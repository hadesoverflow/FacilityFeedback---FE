"use client"

import { useEffect, useMemo, useState } from "react"
import { format, startOfWeek, addDays, isSameDay, parseISO, format as formatDate } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarDays, Clock, MapPin, Users, ChevronLeft, ChevronRight, Ticket } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

import { StaffShell } from "@/components/staff/staff-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Ticket as TicketType, FeedbackCategory, Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

type ShiftStatus = "scheduled" | "on_call" | "leave"

type WorkItem = {
  id: string
  date: string // ISO
  start: string // HH:mm
  end: string // HH:mm
  location: string
  team: string
  status: ShiftStatus
  note?: string
  ticketId?: string
  ticketNumber?: string
  priority?: string
}

function mapTicket(api: any): TicketType {
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

const statusUi: Record<ShiftStatus, { label: string; badge: string }> = {
  scheduled: { label: "Lịch", badge: "bg-blue-100 text-blue-700" },
  on_call: { label: "SLA", badge: "bg-amber-100 text-amber-700" },
  leave: { label: "Nghỉ", badge: "bg-slate-100 text-slate-700" },
}

type Shift = {
  id: string
  date: string
  start: string
  end: string
  department_id: string
  staff_user_id: string
  location: string
  status: ShiftStatus
  note?: string
}

export default function StaffCalendarPage() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
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
      fetch(`${API_BASE}/departments`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
      fetch(`${API_BASE}/shifts/staff/${user.id}`)
        .then(async (r) => {
          if (!r.ok) return []
          const data = await r.json().catch(() => [])
          return Array.isArray(data) ? data : []
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, departmentsRes, shiftsRes]) => {
        try {
          const mappedTickets = ticketsRes.map(mapTicket)
          const mappedCategories = categoriesRes.map((c: any) => ({
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
          const mappedDepartments = departmentsRes.map((d: any) => ({
            id: String(d.id),
            name: d.name,
            code: d.code,
            description: d.description,
            manager_id: d.managerId ? String(d.managerId) : undefined,
            created_at: d.createdAt,
            updated_at: d.updatedAt,
          }))
          const mappedShifts = shiftsRes.map((s: any) => ({
            id: String(s.id),
            date: s.date?.split("T")[0] || "",
            start: s.start || s.startTime || "08:00",
            end: s.end || s.endTime || "17:00",
            department_id: String(s.department_id || s.departmentId || ""),
            staff_user_id: String(s.staff_user_id || s.staffUserId || ""),
            location: s.location || "",
            status: s.status || "scheduled",
            note: s.note || "",
          }))
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          setDepartments(mappedDepartments)
          setShifts(mappedShifts)
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
  }, [user?.id])

  const weekStart = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7)
    return startOfWeek(base, { weekStartsOn: 1 })
  }, [weekOffset])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  // Convert shifts and tickets to work items
  const workItems = useMemo(() => {
    const items: WorkItem[] = []

    // Add shifts from admin
    shifts.forEach((shift) => {
      const department = departments.find((d) => d.id === shift.department_id)
      items.push({
        id: `shift-${shift.id}`,
        date: shift.date,
        start: shift.start,
        end: shift.end,
        location: shift.location || department?.name || "N/A",
        team: department?.name || "Ca làm việc",
        status: shift.status,
        note: shift.note || "Ca làm việc được phân công",
      })
    })

    // Add tickets
    tickets.forEach((ticket) => {
      const ticketDate = parseISO(ticket.created_at)
      const resolutionDue = parseISO(ticket.sla_resolution_due)
      const department = departments.find((d) => d.id === ticket.department_id)
      const category = categories.find((c) => c.id === ticket.category_id)

      if (ticket.status !== "closed" && ticket.status !== "resolved") {
        const isSlaBreached = ticket.is_sla_resolution_breached || ticket.is_sla_response_breached
        
        items.push({
          id: `ticket-${ticket.id}`,
          date: format(ticketDate, "yyyy-MM-dd"),
          start: format(ticketDate, "HH:mm"),
          end: format(resolutionDue, "HH:mm"),
          location: ticket.location || department?.name || "N/A",
          team: department?.name || category?.name || "N/A",
          status: isSlaBreached ? "on_call" : "scheduled",
          note: `${ticket.ticket_number}: ${ticket.title}`,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          priority: ticket.priority,
        })
      }
    })

    return items
  }, [tickets, shifts, categories, departments])

  const workItemsForSelected = useMemo(() => {
    return workItems
      .filter((s) => isSameDay(parseISO(s.date), selectedDate))
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [workItems, selectedDate])

  const workItemCountForDay = (day: Date) => {
    return workItems.filter((s) => isSameDay(parseISO(s.date), day)).length
  }

  if (loading) {
    return (
      <StaffShell title="Lịch làm việc" subtitle="Theo dõi ca làm, trực và lịch nghỉ">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </StaffShell>
    )
  }

  return (
    <StaffShell title="Lịch làm việc" subtitle="Theo dõi các ticket được phân công và SLA">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Tuần {format(weekStart, "dd/MM", { locale: vi })} – {format(addDays(weekStart, 6), "dd/MM", { locale: vi })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setWeekOffset((v) => v - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setWeekOffset(0)}>
                  Hôm nay
                </Button>
                <Button variant="outline" size="icon" onClick={() => setWeekOffset((v) => v + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {weekDays.map((day) => {
                const active = isSameDay(day, selectedDate)
                const count = workItemCountForDay(day)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={[
                      "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                      active ? "border-blue-300 bg-blue-50" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">{format(day, "EEEE", { locale: vi })}</p>
                      <p className="text-lg font-semibold">{format(day, "dd/MM", { locale: vi })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {count > 0 ? (
                        <Badge className="bg-blue-600">{count} ca</Badge>
                      ) : (
                        <Badge variant="secondary">Trống</Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Chi tiết ngày {format(selectedDate, "dd/MM", { locale: vi })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workItemsForSelected.length === 0 ? (
              <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
                Không có ticket nào trong ngày này.
              </div>
            ) : (
              workItemsForSelected.map((item) => {
                const ticket = tickets.find((t) => t.id === item.ticketId)
                const priorityColors: Record<string, string> = {
                  low: "bg-slate-500",
                  medium: "bg-blue-500",
                  high: "bg-orange-500",
                  critical: "bg-red-500",
                }
                const priorityColor = priorityColors[item.priority || "medium"] || "bg-blue-500"

                return (
                  <div key={item.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                          {item.ticketNumber && (
                            <Badge className={`${priorityColor} text-white text-xs`}>{item.ticketNumber}</Badge>
                          )}
                          <span className="text-sm font-semibold">{item.team}</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${statusUi[item.status as ShiftStatus]?.badge || "bg-slate-100 text-slate-700"}`}>
                            {statusUi[item.status as ShiftStatus]?.label || item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                          <span>{item.start} – {item.end}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                          <span>{item.location}</span>
                        </div>
                      </div>
                      <Ticket className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {item.note && (
                    <>
                      <Separator className="my-3" />
                        <p className="text-sm">{item.note}</p>
                    </>
                    )}
                </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  )
}
