"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChatBubble } from "@/components/student/chat-bubble"
import {
  Home,
  Ticket as TicketIcon,
  History,
  User,
  LogOut,
  Bell,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Send,
  Building2,
} from "lucide-react"
import type { Ticket, TicketStatus, FeedbackCategory } from "@/types/database"

const navigation = [
  { name: "Trang chủ", href: "/student", icon: Home },
  { name: "Phản ánh của tôi", href: "/student/tickets", icon: TicketIcon, active: true },
  { name: "Lịch sử", href: "/student/history", icon: History },
  { name: "Tài khoản", href: "/student/profile", icon: User },
]

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Chờ xử lý", color: "bg-yellow-500", icon: Clock },
  in_progress: { label: "Đang xử lý", color: "bg-blue-500", icon: AlertCircle },
  resolved: { label: "Đã xử lý", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "Đã đóng", color: "bg-slate-500", icon: CheckCircle2 },
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function normalizeStatus(status: any): string {
  if (typeof status === "number") {
    const statusMap: Record<number, string> = { 0: "open", 1: "in_progress", 2: "resolved", 3: "closed" }
    return statusMap[status] || "open"
  }
  if (typeof status === "string") {
    const normalized = status
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .toLowerCase()
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

function mapTicketFromApi(api: any): Ticket {
  return {
    id: String(api.id),
    ticket_number: api.ticketNumber,
    title: api.title,
    description: api.description,
    category_id: String(api.categoryId),
    department_id: String(api.departmentId),
    status: normalizeStatus(api.status),
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

function mapCategoryFromApi(api: any): FeedbackCategory {
  return {
    id: String(api.id),
    name: api.name,
    code: api.code,
    description: api.description,
    department_id: String(api.departmentId),
    sla_response_hours: api.slaResponseHours,
    sla_resolution_hours: api.slaResolutionHours,
    priority_default: api.priorityDefault,
    is_active: api.isActive,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  }
}

export default function StudentTicketsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [ticketComments, setTicketComments] = useState<any[]>([])

  // Auto-refresh comments when dialog is open
  useEffect(() => {
    if (!isDetailOpen || !selectedTicket?.id) return

    const fetchComments = async () => {
      try {
        const res = await fetch(`${API_BASE}/tickets/${selectedTicket.id}/comments`)
        if (res.ok) {
          const data = await res.json().catch(() => [])
          setTicketComments(Array.isArray(data) ? data : [])
        } else {
          setTicketComments([])
        }
      } catch {
        setTicketComments([])
      }
    }

    // Initial fetch
    fetchComments()

    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchComments, 3000)

    return () => clearInterval(interval)
  }, [isDetailOpen, selectedTicket?.id])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const url = `${API_BASE}/tickets?reporterId=${user.id}`
    console.log("=== FETCHING USER TICKETS ===")
    console.log("User ID:", user.id, "Type:", typeof user.id)
    console.log("API URL:", url)
    
    Promise.all([
      fetch(url)
        .then(async (r) => {
          console.log("Tickets response status:", r.status)
          if (!r.ok) {
            const errorData = await r.json().catch(() => ({ message: "Failed to fetch tickets" }))
            throw new Error(errorData.message || "Failed to fetch tickets")
          }
          const data = await r.json()
          console.log("Tickets response data:", data)
          // Ensure data is an array
          return Array.isArray(data) ? data : []
        })
        .catch((err) => {
          console.error("Error fetching tickets:", err)
          return [] // Return empty array on error instead of throwing
        }),
      fetch(`${API_BASE}/categories`)
        .then(async (r) => {
          if (!r.ok) {
            console.warn("Failed to fetch categories")
            return []
          }
          return r.json().catch(() => [])
        })
        .catch((err) => {
          console.error("Error fetching categories:", err)
          return [] // Return empty array on error
        }),
    ])
      .then(([ticketsRes, categoriesRes]) => {
        console.log("Received tickets:", ticketsRes)
        console.log("Ticket count:", Array.isArray(ticketsRes) ? ticketsRes.length : 0)
        try {
          const mappedTickets = Array.isArray(ticketsRes) 
            ? ticketsRes.map(mapTicketFromApi).filter(Boolean)
            : []
          const mappedCategories = Array.isArray(categoriesRes)
            ? categoriesRes.map(mapCategoryFromApi).filter(Boolean)
            : []
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          setError(null)
        } catch (mapErr) {
          console.error("Error mapping data:", mapErr)
          setError("Lỗi khi xử lý dữ liệu")
          setTickets([])
          setCategories([])
        }
      })
      .catch((err) => {
        console.error("Error in Promise.all:", err)
        setError(err.message || "Không tải được dữ liệu")
        setTickets([])
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [user])

  const myTickets = useMemo(() => tickets, [tickets])

  const filteredTickets = myTickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && (ticket.status === "open" || ticket.status === "in_progress")) ||
      (activeTab === "resolved" && (ticket.status === "resolved" || ticket.status === "closed"))
    return matchesSearch && matchesTab
  })

  const stats = useMemo(
    () => ({
      all: myTickets.length,
      pending: myTickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      resolved: myTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    }),
    [myTickets]
  )

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Helpdesk</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </Button>
            <div className="flex items-center gap-2 pl-3 border-l">
              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium hidden sm:block">{user?.full_name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Phản ánh của tôi</h1>
            <p className="text-muted-foreground">Theo dõi tiến độ xử lý các phản ánh</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Tạo phản ánh mới
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tạo phản ánh mới</DialogTitle>
                <DialogDescription>Mô tả chi tiết vấn đề bạn gặp phải</DialogDescription>
              </DialogHeader>
              <form className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tiêu đề</Label>
                  <Input placeholder="VD: WiFi phòng A101 không kết nối được" />
                </div>
                <div className="space-y-2">
                  <Label>Vị trí</Label>
                  <Input placeholder="VD: Phòng A101, Tòa nhà A" />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả chi tiết</Label>
                  <Textarea placeholder="Mô tả chi tiết vấn đề bạn gặp phải..." rows={4} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                    onClick={(e) => {
                      e.preventDefault()
                      setIsCreateOpen(false)
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Gửi phản ánh
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Tất cả <Badge variant="secondary">{stats.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                Đang xử lý <Badge variant="secondary">{stats.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2">
                Đã xử lý <Badge variant="secondary">{stats.resolved}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm phản ánh..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading && <div className="text-sm text-muted-foreground">Đang tải...</div>}
          {filteredTickets.map((ticket) => {
            const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open
            const StatusIcon = status.icon
            const category = categories.find((c) => String(c.id) === ticket.category_id)

            return (
              <Card 
                key={ticket.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedTicket(ticket)
                  setIsDetailOpen(true)
                  // Fetch comments for this ticket
                  if (ticket.id) {
                    fetch(`${API_BASE}/tickets/${ticket.id}/comments`)
                      .then(async (r) => {
                        if (r.ok) {
                          const data = await r.json().catch(() => [])
                          setTicketComments(Array.isArray(data) ? data : [])
                        } else {
                          setTicketComments([])
                        }
                      })
                      .catch(() => setTicketComments([]))
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${status.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <StatusIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category?.name}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-slate-900">{ticket.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{ticket.location}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className={`${status.color} text-white border-0 mb-2`}>
                        {status.label}
                      </Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredTickets.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TicketIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-900 mb-1">Không có phản ánh nào</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "all"
                    ? "Bạn chưa gửi phản ánh nào"
                    : activeTab === "pending"
                      ? "Không có phản ánh đang xử lý"
                      : "Không có phản ánh đã xử lý"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog 
        open={isDetailOpen} 
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedTicket(null)
            setTicketComments([])
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedTicket?.ticket_number}</Badge>
              {selectedTicket && (
                <Badge className={`${statusConfig[selectedTicket.status as keyof typeof statusConfig]?.color || "bg-slate-500"} text-white`}>
                  {statusConfig[selectedTicket.status as keyof typeof statusConfig]?.label || selectedTicket.status}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl">{selectedTicket?.title}</DialogTitle>
            <DialogDescription>{selectedTicket?.location}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Mô tả vấn đề</Label>
                <p className="mt-1 text-sm text-muted-foreground p-3 bg-slate-50 rounded-lg whitespace-pre-wrap">
                  {selectedTicket?.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Trạng thái</Label>
                  <p className="text-sm mt-1">
                    {selectedTicket && statusConfig[selectedTicket.status as keyof typeof statusConfig]?.label}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày tạo</Label>
                  <p className="text-sm mt-1">
                    {selectedTicket?.created_at && new Date(selectedTicket.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>

              {selectedTicket?.assignee && (
                <div>
                  <Label className="text-sm font-medium">Người xử lý</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {((selectedTicket.assignee as any)?.fullName || (selectedTicket.assignee as any)?.full_name || "S")
                          ?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {(selectedTicket.assignee as any)?.fullName || (selectedTicket.assignee as any)?.full_name || "N/A"}
                    </span>
                  </div>
                </div>
              )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">Ghi chú từ staff</Label>
                {ticketComments.length > 0 ? (
                  <div className="space-y-3">
                    {ticketComments
                      .filter((comment: any) => !comment.isInternal) // Only show non-internal comments to students
                      .map((comment: any) => {
                        const commentUser = comment.user || {}
                        const userName = commentUser.fullName || commentUser.full_name || commentUser.FullName || "Staff"
                        const createdAt = comment.createdAt || comment.created_at
                        return (
                      <div key={comment.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                                  {userName.charAt(0).toUpperCase() || "S"}
                            </AvatarFallback>
                          </Avatar>
                              <span className="text-xs font-medium">{userName}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                                {createdAt && new Date(createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.content}</p>
                      </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground bg-slate-50 rounded-lg p-4">
                    {selectedTicket?.status === "open" || selectedTicket?.status === "in_progress"
                      ? "Chưa có ghi chú từ staff"
                      : "Chưa có ghi chú xử lý"}
                </div>
              )}
                </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Bubble */}
      <ChatBubble />
    </div>
  )
}
