"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TicketCard } from "@/components/tickets/ticket-card"
import { Plus, Search, Filter } from "lucide-react"
import { Link } from "react-router-dom"
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
    const normalized = status.toLowerCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "").toLowerCase()
    return normalized === "inprogress" ? "in_progress" : normalized
  }
  return "open"
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
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
  }, [])

  const allTickets = tickets

  const filteredTickets = allTickets.filter((ticket) => {
    try {
      if (statusFilter !== "all") {
        const normalizedStatus = normalizeStatus(ticket.status)
        if (normalizedStatus !== statusFilter) return false
      }
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false
      if (categoryFilter !== "all" && ticket.category_id !== categoryFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.ticket_number || "").toLowerCase().includes(query) ||
          (ticket.description || "").toLowerCase().includes(query)
        )
      }
      return true
    } catch (err) {
      console.error("Error filtering ticket:", err, ticket)
      return false
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh sách Ticket</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi tất cả các ticket phản ánh</p>
        </div>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo Ticket mới
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mã, tiêu đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="open">Mở</SelectItem>
                <SelectItem value="in_progress">Đang xử lý</SelectItem>
                <SelectItem value="resolved">Đã giải quyết</SelectItem>
                <SelectItem value="closed">Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Độ ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả độ ưu tiên</SelectItem>
                <SelectItem value="low">Thấp</SelectItem>
                <SelectItem value="medium">Trung bình</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
                <SelectItem value="critical">Khẩn cấp</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Đang tải...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">Không tìm thấy ticket nào</p>
              </CardContent>
            </Card>
          ) : (
            filteredTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Hiển thị {filteredTickets.length} / {allTickets.length} ticket
        </p>
      </div>
    </div>
  )
}
