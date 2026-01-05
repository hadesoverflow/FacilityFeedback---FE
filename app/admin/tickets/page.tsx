"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Search,
  MoreHorizontal,
  Eye,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  ChevronRight,
  Timer,
  User as UserIcon,
  DoorOpen,
} from "lucide-react"
import type { Ticket as TicketType, TicketStatus, TicketPriority, FeedbackCategory, Department, User } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function normalizePriority(priority: any): string {
  if (typeof priority === "number") {
    const priorityMap: Record<number, string> = { 0: "low", 1: "medium", 2: "high", 3: "critical" }
    return priorityMap[priority] || "medium"
  }
  if (typeof priority === "string") {
    return priority.toLowerCase()
  }
  return "medium"
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
    priority: normalizePriority(api.priority),
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
  { name: "Tickets", href: "/admin/tickets", icon: Ticket, active: true },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Chờ xử lý", color: "bg-yellow-500", bgColor: "bg-yellow-50 text-yellow-700" },
  in_progress: { label: "Đang xử lý", color: "bg-blue-500", bgColor: "bg-blue-50 text-blue-700" },
  resolved: { label: "Đã xử lý", color: "bg-green-500", bgColor: "bg-green-50 text-green-700" },
  closed: { label: "Đã đóng", color: "bg-slate-500", bgColor: "bg-slate-50 text-slate-700" },
}

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "bg-slate-500" },
  medium: { label: "Trung bình", color: "bg-blue-500" },
  high: { label: "Cao", color: "bg-orange-500" },
  critical: { label: "Khẩn cấp", color: "bg-red-500" },
}

export default function TicketsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState("")
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([])
  const [expandedDuplicateGroup, setExpandedDuplicateGroup] = useState<string | null>(null)

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
      fetch(`${API_BASE}/rooms`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
      fetch(`${API_BASE}/shifts`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
      fetch(`${API_BASE}/tickets/duplicates`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, departmentsRes, usersRes, roomsRes, shiftsRes, duplicatesRes]) => {
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
          setRooms(Array.isArray(roomsRes) ? roomsRes : [])
          setShifts(Array.isArray(shiftsRes) ? shiftsRes : [])
          setDuplicateGroups(Array.isArray(duplicatesRes) ? duplicatesRes : [])
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

  // Polling for real-time ticket updates (every 5 seconds)
  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTickets(data.map(mapTicketFromApi).filter(Boolean))
        }
      }
    } catch (err) {
      console.error("Error fetching tickets:", err)
    }
  }

  useEffect(() => {
    const interval = setInterval(fetchTickets, 5000)
    return () => clearInterval(interval)
  }, [])

  const staffUsers = users.filter((u) => u.role === "staff" || u.role === "department_admin")

  const filteredTickets = tickets.filter((ticket) => {
    const normalizedStatus = normalizeStatus(ticket.status)
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "open" && normalizedStatus === "open") ||
      (activeTab === "in_progress" && normalizedStatus === "in_progress") ||
      (activeTab === "resolved" && (normalizedStatus === "resolved" || normalizedStatus === "closed")) ||
      (activeTab === "sla_breached" && (ticket.is_sla_response_breached || ticket.is_sla_resolution_breached))
    return matchesSearch && matchesStatus && matchesPriority && matchesTab
  })

  const stats = {
    all: tickets.length,
    open: tickets.filter((t) => normalizeStatus(t.status) === "open").length,
    in_progress: tickets.filter((t) => normalizeStatus(t.status) === "in_progress").length,
    resolved: tickets.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "resolved" || s === "closed"
    }).length,
    sla_breached: tickets.filter((t) => t.is_sla_response_breached || t.is_sla_resolution_breached).length,
  }

  const handleAssign = async () => {
    if (!selectedTicket || !selectedAssignee) return
    try {
      const response = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: selectedAssignee }),
      })
      if (response.ok) {
        const updated = await response.json()
        setTickets(tickets.map((t) => (t.id === selectedTicket.id ? mapTicketFromApi(updated) : t)))
        
        // Create notification for assigned staff
        const assignedStaff = staffUsers.find(s => s.id === selectedAssignee)
        if (assignedStaff) {
          try {
            await fetch(`${API_BASE}/notifications`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: selectedAssignee,
                ticketId: selectedTicket.id,
                title: "Phân công ticket mới",
                message: `Bạn đã được phân công xử lý ticket "${selectedTicket.title}" (${selectedTicket.ticket_number})`,
                type: "assignment",
              }),
            })
          } catch (notifErr) {
            console.error("Error creating notification:", notifErr)
          }
        }
        
        setIsAssignOpen(false)
        setSelectedTicket(null)
        setSelectedAssignee("")
      } else {
        const error = await response.json()
        console.error("Error assigning ticket:", error)
      }
    } catch (err) {
      console.error("Error assigning ticket:", err)
    }
  }

  const handleResolve = async (ticket: TicketType) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      })
      if (response.ok) {
        const updated = await response.json()
        setTickets(tickets.map((t) => (t.id === ticket.id ? mapTicketFromApi(updated) : t)))
      }
    } catch (err) {
      console.error("Error resolving ticket:", err)
    }
  }

  const handleClose = async (ticket: TicketType) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Closed" }),
      })
      if (response.ok) {
        const updated = await response.json()
        setTickets(tickets.map((t) => (t.id === ticket.id ? mapTicketFromApi(updated) : t)))
      }
    } catch (err) {
      console.error("Error closing ticket:", err)
    }
  }

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
              <h1 className="text-xl font-semibold">Quản lý Ticket</h1>
              <p className="text-sm text-muted-foreground">Gửi ticket, Assign, Resolve và SLA Tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm ticket..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white">
              <TabsTrigger value="all" className="gap-2">
                Tất cả <Badge variant="secondary">{stats.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="open" className="gap-2">
                <Clock className="w-4 h-4" />
                Chờ xử lý <Badge variant="secondary">{stats.open}</Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-2">
                <Timer className="w-4 h-4" />
                Đang xử lý <Badge variant="secondary">{stats.in_progress}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Đã xử lý <Badge variant="secondary">{stats.resolved}</Badge>
              </TabsTrigger>
              <TabsTrigger value="sla_breached" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Vi phạm SLA <Badge variant="destructive">{stats.sla_breached}</Badge>
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Đơn trùng lặp <Badge variant="secondary">{duplicateGroups.reduce((sum, g) => sum + g.count, 0)}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Độ ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả độ ưu tiên</SelectItem>
                {Object.entries(priorityConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tickets List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {activeTab === "duplicates" 
                  ? `Đơn trùng lặp (${duplicateGroups.length} nhóm - ${duplicateGroups.reduce((sum, g) => sum + g.count, 0)} ticket)`
                  : `Danh sách ticket (${filteredTickets.length})`}
              </CardTitle>
              <CardDescription>
                {activeTab === "duplicates"
                  ? "Các ticket có cùng danh mục và vị trí đang chờ xử lý"
                  : "Quản lý, phân công và theo dõi tiến độ xử lý ticket"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
              ) : activeTab === "duplicates" ? (
                duplicateGroups.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">Không có đơn trùng lặp</h3>
                    <p className="text-sm text-muted-foreground">Tất cả ticket đều là duy nhất</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {duplicateGroups.map((group, idx) => {
                      const groupKey = `${group.categoryId}-${group.location}`
                      const isExpanded = expandedDuplicateGroup === groupKey
                      const category = categories.find((c) => c.id === String(group.categoryId))
                      const roomInfo = rooms.find((r: any) => String(r.id) === group.location)
                      
                      return (
                        <div key={idx} className="border rounded-xl overflow-hidden">
                          <div 
                            className="p-4 bg-orange-50 border-b cursor-pointer hover:bg-orange-100 transition-colors"
                            onClick={() => setExpandedDuplicateGroup(isExpanded ? null : groupKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                  {group.count}
                                </div>
                                <div>
                                  <h4 className="font-medium text-slate-900">
                                    {category?.name || "Không xác định"} 
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    📍 {roomInfo ? `${roomInfo.building} - Tầng ${roomInfo.floor} - ${roomInfo.name}` : group.location || "Không có vị trí"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-orange-100 text-orange-700">
                                  {group.count} ticket trùng
                                </Badge>
                                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="divide-y">
                              {group.tickets.map((t: any) => {
                                const ticket = mapTicketFromApi(t)
                                const normalizedStatus = normalizeStatus(ticket.status)
                                const status = statusConfig[normalizedStatus as TicketStatus] || statusConfig.open
                                const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                                const reporterFromApi = t.reporter as any
                                const reporter = reporterFromApi?.fullName || reporterFromApi?.FullName || "Không xác định"
                                
                                return (
                                  <div 
                                    key={ticket.id} 
                                    className="p-4 hover:bg-slate-50 cursor-pointer"
                                    onClick={() => {
                                      setSelectedTicket(ticket)
                                      setIsDetailOpen(true)
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                                            <Badge className={`${priority.color} text-white text-xs`}>{priority.label}</Badge>
                                            <Badge className={status.bgColor}>{status.label}</Badge>
                                          </div>
                                          <p className="font-medium text-slate-900 mt-1">{ticket.title}</p>
                                          <p className="text-sm text-muted-foreground">
                                            Người gửi: {reporter} • {new Date(ticket.created_at).toLocaleDateString("vi-VN")}
                                          </p>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="sm">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              ) : filteredTickets.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">Không có ticket nào</h3>
                  <p className="text-sm text-muted-foreground">Thử thay đổi bộ lọc để xem thêm ticket</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    const normalizedStatus = normalizeStatus(ticket.status)
                    const status = statusConfig[normalizedStatus as TicketStatus] || statusConfig.open
                    const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                    const category = categories.find((c) => c.id === ticket.category_id)
                    const department = departments.find((d) => d.id === ticket.department_id)
                    const assignee = users.find((u) => u.id === ticket.assignee_id)
                    // Use ticket.reporter if available (from API), otherwise find from users list
                    // API returns reporter with fullName (camelCase), users list has full_name (snake_case)
                    const reporterFromApi = ticket.reporter as any
                    const reporter = reporterFromApi?.fullName || reporterFromApi?.FullName 
                      ? { ...ticket.reporter, full_name: reporterFromApi.fullName || reporterFromApi.FullName }
                      : users.find((u) => u.id === ticket.reporter_id)
                    const isSlaBreached = ticket.is_sla_response_breached || ticket.is_sla_resolution_breached

                  // Lookup room info từ location (có thể là room ID hoặc format "Tòa nhà - Tầng - Phòng")
                    const roomInfo = rooms.find((r: any) => String(r.id) === ticket.location || r.code === ticket.location)
                    const locationParts = ticket.location?.includes(" - ") ? ticket.location.split(" - ") : []
                    const hasDetailedLocation = locationParts.length >= 2
                    
                    // Ưu tiên lấy từ roomInfo nếu có
                    const building = roomInfo?.building || (hasDetailedLocation ? locationParts[0] : "")
                    const floor = roomInfo?.floor || (hasDetailedLocation ? locationParts[1] : "")
                    const roomName = roomInfo?.name || (hasDetailedLocation ? locationParts[2] : "")
                    const hasRoomInfo = roomInfo || hasDetailedLocation

                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-xl border ${isSlaBreached ? "border-red-200 bg-red-50" : "bg-white"} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 ${status.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                            <Badge className={`${priority.color} text-white text-xs`}>{priority.label}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {category?.name}
                            </Badge>
                            {isSlaBreached && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                SLA Vi phạm
                              </Badge>
                            )}
                          </div>
                          {/* Tên người báo cáo nổi bật */}
                          {reporter && (
                            <p className="text-sm font-semibold text-blue-600 mb-1">
                              {reporter.full_name}
                            </p>
                          )}
                          <h3 className="font-medium text-slate-900">{ticket.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {department?.name}
                            </span>
                            {hasRoomInfo ? (
                              <>
                                {building && (
                                  <span className="flex items-center gap-1">
                                    🏢 Tòa nhà: <strong>{building}</strong>
                                  </span>
                                )}
                                {floor && (
                                  <span className="flex items-center gap-1">
                                    📍 Tầng: <strong>{String(floor).replace("Tầng ", "")}</strong>
                                  </span>
                                )}
                                {roomName && (
                                  <span className="flex items-center gap-1">
                                    🚪 Phòng: <strong>{roomName}</strong>
                                  </span>
                                )}
                              </>
                            ) : ticket.location && (
                              <span className="flex items-center gap-1">
                                📍 Vị trí: <strong>{ticket.location}</strong>
                              </span>
                            )}
                            <span>{new Date(ticket.created_at).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{assignee.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{assignee.full_name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              Chưa phân công
                            </Badge>
                          )}
                          <Badge className={status.bgColor}>{status.label}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTicket(ticket)
                                  setIsDetailOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTicket(ticket)
                                  setIsAssignOpen(true)
                                }}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Phân công
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {ticket.status === "in_progress" && (
                                <DropdownMenuItem onClick={() => handleResolve(ticket)}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Đánh dấu đã xử lý
                                </DropdownMenuItem>
                              )}
                              {ticket.status === "resolved" && (
                                <DropdownMenuItem onClick={() => handleClose(ticket)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Đóng ticket
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>

                      {/* SLA Info */}
                      <div className="mt-3 pt-3 border-t flex items-center gap-6 text-xs">
                        <div
                          className={`flex items-center gap-1 ${ticket.is_sla_response_breached ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            SLA Phản hồi:{" "}
                            {ticket.first_response_at
                              ? "Đã phản hồi"
                              : new Date(ticket.sla_response_due).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${ticket.is_sla_resolution_breached ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          <Timer className="w-3 h-3" />
                          <span>SLA Xử lý: {new Date(ticket.sla_resolution_due).toLocaleString("vi-VN")}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedTicket?.ticket_number}</Badge>
              {selectedTicket && (
                <>
                  <Badge className={priorityConfig[selectedTicket.priority].color + " text-white"}>
                    {priorityConfig[selectedTicket.priority].label}
                  </Badge>
                  <Badge className={statusConfig[normalizeStatus(selectedTicket.status)].bgColor}>
                    {statusConfig[normalizeStatus(selectedTicket.status)].label}
                  </Badge>
                  {(selectedTicket.is_sla_response_breached || selectedTicket.is_sla_resolution_breached) && (
                    <Badge variant="destructive">SLA Vi phạm</Badge>
                  )}
                </>
              )}
            </div>
            <DialogTitle className="text-xl">{selectedTicket?.title}</DialogTitle>
            <DialogDescription>{selectedTicket?.location}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Mô tả vấn đề</Label>
              <p className="mt-1 text-sm text-muted-foreground p-3 bg-slate-50 rounded-lg whitespace-pre-wrap">
                {selectedTicket?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Danh mục</Label>
                <p className="text-sm mt-1">
                  {categories.find((c) => c.id === selectedTicket?.category_id)?.name || "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phòng ban</Label>
                <p className="text-sm mt-1">
                  {departments.find((d) => d.id === selectedTicket?.department_id)?.name || "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Người báo cáo</Label>
                <p className="text-sm mt-1">
                  {users.find((u) => u.id === selectedTicket?.reporter_id)?.full_name || "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Người được phân công</Label>
                <p className="text-sm mt-1">
                  {selectedTicket?.assignee_id
                    ? users.find((u) => u.id === selectedTicket?.assignee_id)?.full_name || "-"
                    : "Chưa phân công"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">SLA Phản hồi</Label>
                <p className={`text-sm mt-1 ${selectedTicket?.is_sla_response_breached ? "text-red-600" : ""}`}>
                  {selectedTicket?.first_response_at
                    ? `Đã phản hồi: ${new Date(selectedTicket.first_response_at).toLocaleString("vi-VN")}`
                    : selectedTicket?.sla_response_due
                    ? new Date(selectedTicket.sla_response_due).toLocaleString("vi-VN")
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">SLA Xử lý</Label>
                <p className={`text-sm mt-1 ${selectedTicket?.is_sla_resolution_breached ? "text-red-600" : ""}`}>
                  {selectedTicket?.sla_resolution_due
                    ? new Date(selectedTicket.sla_resolution_due).toLocaleString("vi-VN")
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Ngày tạo</Label>
                <p className="text-sm mt-1">
                  {selectedTicket?.created_at
                    ? new Date(selectedTicket.created_at).toLocaleString("vi-VN")
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Cập nhật lần cuối</Label>
                <p className="text-sm mt-1">
                  {selectedTicket?.updated_at
                    ? new Date(selectedTicket.updated_at).toLocaleString("vi-VN")
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>
            {selectedTicket && !selectedTicket.assignee_id && (
              <Button
                onClick={() => {
                  setIsDetailOpen(false)
                  setIsAssignOpen(true)
                }}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Phân công
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phân công xử lý ticket</DialogTitle>
            <DialogDescription>Chọn nhân viên để phân công xử lý ticket "{selectedTicket?.title}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Chọn nhân viên</Label>
            {(() => {
              // Lọc staff theo department của ticket
              const departmentStaff = staffUsers.filter(
                (staff) => staff.department_id === selectedTicket?.department_id
              )
              const ticketDepartment = departments.find(d => d.id === selectedTicket?.department_id)
              
              return (
                <>
                  {ticketDepartment && (
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                      Nhân viên thuộc: <strong>{ticketDepartment.name}</strong>
                    </p>
                  )}
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Chọn nhân viên phụ trách" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentStaff.length > 0 ? (
                        departmentStaff.map((staff) => {
                          const now = new Date()
                          // Convert to Vietnam time (UTC+7)
                          const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
                          const today = vnNow.toISOString().split("T")[0]
                          const currentHour = vnNow.getUTCHours()
                          const currentMinute = vnNow.getUTCMinutes()
                          const currentTimeInMinutes = currentHour * 60 + currentMinute
                          
                          // Find all shifts for this staff today
                          const todayShifts = shifts.filter((s: any) => {
                            const shiftDate = s.date?.split("T")[0] || s.date
                            const staffId = String(s.staff_user_id || s.staffUserId)
                            return shiftDate === today && staffId === staff.id
                          })
                          
                          // Check if currently on duty based on shift time
                          // Ca 1: 8:00-12:00, Ca 2: 13:00-17:00
                          let isOnDuty = false
                          let isOnLeave = false
                          
                          todayShifts.forEach((shift: any) => {
                            const shiftStatus = shift.status?.toLowerCase?.() || ""
                            
                            if (shiftStatus === "leave") {
                              isOnLeave = true
                            } else {
                              // Parse shift time
                              const startTime = shift.start_time || shift.startTime || ""
                              const endTime = shift.end_time || shift.endTime || ""
                              
                              // Convert time string to minutes (e.g., "08:00" -> 480)
                              const parseTime = (timeStr: string) => {
                                const parts = timeStr.split(":")
                                return parseInt(parts[0]) * 60 + parseInt(parts[1] || "0")
                              }
                              
                              if (startTime && endTime) {
                                const startMinutes = parseTime(startTime)
                                const endMinutes = parseTime(endTime)
                                
                                if (currentTimeInMinutes >= startMinutes && currentTimeInMinutes <= endMinutes) {
                                  isOnDuty = true
                                }
                              }
                            }
                          })
                          
                          // If on leave, not on duty
                          if (isOnLeave) isOnDuty = false
                          
                          return (
                            <SelectItem 
                              key={staff.id} 
                              value={staff.id}
                              disabled={isOnLeave}
                            >
                              <div className={`flex items-center gap-2 w-full py-1 px-2 rounded ${
                                isOnLeave ? "opacity-50 bg-red-50 border border-red-200" : 
                                isOnDuty ? "bg-green-100 border border-green-300" : ""
                              }`}>
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className={`text-xs font-bold ${
                                    isOnLeave ? "bg-red-500 text-white" : 
                                    isOnDuty ? "bg-green-500 text-white ring-2 ring-green-300" : 
                                    "bg-slate-200"
                                  }`}>
                                    {staff.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`flex-1 ${
                                  isOnLeave ? "text-red-600 line-through" : 
                                  isOnDuty ? "font-bold text-green-800" : 
                                  "text-slate-600"
                                }`}>
                                  {staff.full_name}
                                </span>
                                {isOnDuty && (
                                  <Badge className="bg-green-500 text-white text-xs animate-pulse shadow-lg shadow-green-200">
                                    🟢 Đang trực
                                  </Badge>
                                )}
                                {isOnLeave && (
                                  <Badge className="text-xs bg-red-500 text-white">
                                    🔴 Nghỉ
                                  </Badge>
                                )}
                                {!isOnDuty && !isOnLeave && (
                                  <Badge variant="outline" className="text-xs text-slate-400">
                                    Không có lịch
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Không có nhân viên trong phòng ban này
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAssign} className="bg-violet-600 hover:bg-violet-700">
              Phân công
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
