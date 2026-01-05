"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { NotificationDropdown } from "@/components/staff/notification-dropdown"
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Search,
  Play,
  Timer,
  Building2,
  MessageSquare,
  ChevronRight,
  Calendar,
  TrendingUp,
  User as UserIcon,
  Send,
} from "lucide-react"
import type { Ticket, TicketStatus, FeedbackCategory, User } from "@/types/database"

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
  open: { label: "Chờ xử lý", color: "bg-yellow-500", textColor: "text-yellow-600" },
  in_progress: { label: "Đang xử lý", color: "bg-blue-500", textColor: "text-blue-600" },
  resolved: { label: "Đã xử lý", color: "bg-green-500", textColor: "text-green-600" },
  closed: { label: "Đã đóng", color: "bg-slate-500", textColor: "text-slate-600" },
}

const priorityConfig = {
  low: { label: "Thấp", color: "bg-slate-500" },
  medium: { label: "Trung bình", color: "bg-blue-500" },
  high: { label: "Cao", color: "bg-orange-500" },
  critical: { label: "Khẩn cấp", color: "bg-red-500" },
}

export default function StaffTasksPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [comment, setComment] = useState("")
  const [chatMessage, setChatMessage] = useState("")
  const [ticketComments, setTicketComments] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<any[]>([])

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
      fetch(`${API_BASE}/rooms`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([ticketsRes, categoriesRes, roomsRes]) => {
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
          setRooms(Array.isArray(roomsRes) ? roomsRes : [])
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

  // Polling for real-time ticket updates (every 5 seconds)
  useEffect(() => {
    if (!user) return
    const fetchTickets = async () => {
      try {
        const res = await fetch(`${API_BASE}/tickets?assigneeId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setTickets(data.map(mapTicketFromApi).filter((t): t is Ticket => t !== null))
          }
        }
      } catch (err) {
        console.error("Error fetching tickets:", err)
      }
    }
    const interval = setInterval(fetchTickets, 5000)
    return () => clearInterval(interval)
  }, [user])

  const pendingTickets = tickets.filter((t) => {
    const s = normalizeStatus(t.status)
    return s === "open" || s === "in_progress"
  })
  const completedTickets = tickets.filter((t) => {
    const s = normalizeStatus(t.status)
    return s === "resolved" || s === "closed"
  })

  const filteredTickets = (activeTab === "pending" ? pendingTickets : completedTickets).filter(
    (ticket) => {
      try {
        const query = searchQuery.toLowerCase()
        return (
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.ticket_number || "").toLowerCase().includes(query)
        )
      } catch (err) {
        console.error("Error filtering ticket:", err, ticket)
        return false
      }
    },
  )

  const stats = {
    assigned: tickets.length,
    pending: pendingTickets.length,
    completed: completedTickets.length,
    slaAtRisk: tickets.filter((t) => t.is_sla_resolution_breached || t.is_sla_response_breached).length,
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
      } else {
        const errorText = await response.text()
        console.error("Error starting task:", response.status, errorText)
        alert("Không thể bắt đầu nhiệm vụ. Vui lòng thử lại.")
      }
    } catch (error) {
      console.error("Error starting task:", error)
      alert("Không thể bắt đầu nhiệm vụ. Vui lòng thử lại.")
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
        setIsDetailOpen(false)
        setSelectedTicket(null)
      }
    } catch (error) {
      console.error("Error completing task:", error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const openDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setComment("") // Reset comment when opening detail
    setIsDetailOpen(true)
    // Fetch comments for this ticket
    if (ticket.id) {
      fetch(`${API_BASE}/tickets/${ticket.id}/comments`)
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json().catch(() => [])
            setTicketComments(Array.isArray(data) ? data : [])
          }
        })
        .catch(() => setTicketComments([]))
    }
  }

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !user || !selectedTicket?.id || !selectedTicket?.reporter_id) return
    try {
      await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          senderId: user.id,
          receiverId: selectedTicket.reporter_id,
          content: chatMessage,
        }),
      })
      setChatMessage("")
      
      // Refresh chat messages
      const res = await fetch(`${API_BASE}/messages/ticket/${selectedTicket.id}/conversation?userId1=${user.id}&userId2=${selectedTicket.reporter_id}`)
      const data = await res.json()
      setChatMessages(Array.isArray(data) ? data : [])
    } catch {
      console.error("Gửi tin nhắn thất bại")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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
        <header className="sticky top-0 z-40 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Nhiệm vụ được giao</h1>
              <p className="text-sm text-muted-foreground">Quản lý và xử lý các ticket được phân công</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nhiệm vụ..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <NotificationDropdown />
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats */}
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

          {/* Tabs and List */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Đang xử lý
                      <Badge variant="secondary">{stats.pending}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Hoàn thành
                      <Badge variant="secondary">{stats.completed}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status]
                  const priority = priorityConfig[ticket.priority]
                  const category = categories.find((c) => c.id === ticket.category_id)
                  const reporter = ticket.reporter as any
                  const reporterName = reporter?.fullName || reporter?.full_name || reporter?.FullName
                  const isSlaBreached = ticket.is_sla_resolution_breached || ticket.is_sla_response_breached
                  
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
                      onClick={() => openDetail(ticket)}
                      className={`p-4 rounded-xl border ${isSlaBreached ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"} hover:shadow-md transition-all cursor-pointer group`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${status.color} bg-opacity-10`}>
                          {ticket.status === "in_progress" ? (
                            <Play className={`w-5 h-5 ${status.textColor}`} />
                          ) : ticket.status === "open" ? (
                            <Clock className={`w-5 h-5 ${status.textColor}`} />
                          ) : (
                            <CheckCircle2 className={`w-5 h-5 ${status.textColor}`} />
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
                          {/* Tên người báo cáo nổi bật */}
                          {reporterName && (
                            <p className="text-sm font-semibold text-blue-600 mb-1">
                              {reporterName}
                            </p>
                          )}
                          <h3 className="font-medium text-slate-900 truncate">{ticket.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
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
                    <h3 className="font-medium text-slate-900 mb-1">Không có nhiệm vụ nào</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "pending" ? "Bạn đã hoàn thành tất cả nhiệm vụ!" : "Chưa có nhiệm vụ hoàn thành"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedTicket?.ticket_number}</Badge>
              {selectedTicket && (
                <Badge className={`${statusConfig[selectedTicket.status].color} text-white`}>
                  {statusConfig[selectedTicket.status].label}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl">{selectedTicket?.title}</DialogTitle>
            <DialogDescription>{selectedTicket?.location}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Mô tả vấn đề</Label>
              <p className="mt-1 text-sm text-muted-foreground p-3 bg-slate-50 rounded-lg">
                {selectedTicket?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">SLA Phản hồi</Label>
                <p className="text-sm mt-1">
                  {selectedTicket?.first_response_at
                    ? "Đã phản hồi"
                    : selectedTicket?.sla_response_due &&
                      new Date(selectedTicket.sla_response_due).toLocaleString("vi-VN")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">SLA Xử lý</Label>
                <p className="text-sm mt-1">
                  {selectedTicket?.sla_resolution_due &&
                    new Date(selectedTicket.sla_resolution_due).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {selectedTicket?.reporter && (
              <div>
                <Label className="text-sm font-medium">Người báo cáo</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {((selectedTicket.reporter as any)?.fullName || (selectedTicket.reporter as any)?.full_name || "S")
                        ?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {(selectedTicket.reporter as any)?.fullName || (selectedTicket.reporter as any)?.full_name || "N/A"}
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Ghi chú xử lý</Label>
              <Textarea
                className="mt-1"
                placeholder="Nhập ghi chú về quá trình xử lý..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>
            {comment.trim() && (
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={async () => {
                  if (!selectedTicket?.id || !user?.id || !comment.trim()) return
                  try {
                    const response = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/comments`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user.id,
                        content: comment,
                        isInternal: false,
                      }),
                    })
                    if (response.ok) {
                      // Refresh comments
                      const res = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/comments`)
                      if (res.ok) {
                        const data = await res.json().catch(() => [])
                        setTicketComments(Array.isArray(data) ? data : [])
                      }
                      setComment("")
                      toast({
                        title: "✅ Thành công",
                        description: "Ghi chú đã được gửi đến sinh viên",
                        duration: 3000,
                      })
                      setIsDetailOpen(false)
                    } else {
                      const errorText = await response.text()
                      console.error("Error saving comment:", response.status, errorText)
                      alert("Không thể lưu ghi chú. Vui lòng thử lại.")
                    }
                  } catch (error) {
                    console.error("Error saving comment:", error)
                    alert("Không thể lưu ghi chú. Vui lòng thử lại.")
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Xác nhận ghi chú
              </Button>
            )}
            {selectedTicket?.status === "open" && (
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => {
                  if (selectedTicket) handleStartTask(selectedTicket)
                  setIsDetailOpen(false)
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                Bắt đầu xử lý
              </Button>
            )}
            {selectedTicket?.status === "in_progress" && (
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={() => selectedTicket && handleCompleteTask(selectedTicket)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Đánh dấu hoàn thành
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      {selectedTicket?.reporter && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Nhắn tin với {(selectedTicket.reporter as any)?.fullName || (selectedTicket.reporter as any)?.full_name}
              </DialogTitle>
              <DialogDescription>
                Trao đổi về ticket: {selectedTicket.ticket_number}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-3">
                {chatMessages.map((message: any) => {
                  const isFromMe = message.senderId === user?.id
                  const sender = message.sender
                  return (
                    <div key={message.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          isFromMe
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {!isFromMe && sender && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {sender.fullName || sender.full_name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            isFromMe ? "text-blue-100" : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {chatMessages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex items-center gap-2">
              <Input
                placeholder="Nhập tin nhắn..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChatMessage()
                  }
                }}
              />
              <Button onClick={handleSendChatMessage} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
