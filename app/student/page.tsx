"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MapPin, Calendar } from "lucide-react"
import { ChatBubble } from "@/components/student/chat-bubble"
import { StudentNotificationDropdown } from "@/components/student/notification-dropdown"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Wifi,
  Monitor,
  Zap,
  Droplets,
  Armchair,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Bell,
  User,
  Search,
  ChevronRight,
  Sparkles,
  Send,
  Building2,
} from "lucide-react"
import type { Ticket, FeedbackCategory } from "@/types/database"

const quickCategories = [
  { id: "1", name: "WiFi", icon: Wifi, color: "bg-blue-500", description: "Sự cố kết nối mạng" },
  { id: "2", name: "Thiết bị", icon: Monitor, color: "bg-emerald-500", description: "Máy chiếu, điều hòa, quạt" },
  { id: "4", name: "Điện", icon: Zap, color: "bg-amber-500", description: "Mất điện, chập điện" },
  { id: "5", name: "Nước", icon: Droplets, color: "bg-cyan-500", description: "Rò rỉ, tắc nghẽn" },
  { id: "3", name: "Nội thất", icon: Armchair, color: "bg-violet-500", description: "Bàn ghế, cửa, tường" },
]

const statusConfig = {
  open: { label: "Chờ xử lý", color: "bg-yellow-500", icon: Clock },
  in_progress: { label: "Đang xử lý", color: "bg-blue-500", icon: AlertCircle },
  resolved: { label: "Đã xử lý", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "Đã đóng", color: "bg-slate-500", icon: CheckCircle2 },
}

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

export default function StudentHomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState("")
  const [selectedRoom, setSelectedRoom] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [ticketComments, setTicketComments] = useState<any[]>([])

  const normalizeStatusKey = (status: string | number | undefined) => {
    if (status === undefined || status === null) return "open"
    const s = String(status).toLowerCase()
    if (s === "0" || s === "open") return "open"
    if (s === "1" || s === "in_progress" || s === "inprogress") return "in_progress"
    if (s === "2" || s === "resolved") return "resolved"
    if (s === "3" || s === "closed") return "closed"
    return "open"
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/tickets?reporterId=${user.id}`)
        .then(async (r) => {
          if (!r.ok) {
            console.warn("Failed to fetch tickets:", r.status)
            return []
          }
          const data = await r.json().catch(() => [])
          return Array.isArray(data) ? data : []
        })
        .catch((err) => {
          console.error("Error fetching tickets:", err)
          return []
        }),
      fetch(`${API_BASE}/categories`)
        .then(async (r) => {
          if (!r.ok) {
            console.warn("Failed to fetch categories:", r.status)
            return []
          }
          return r.json().catch(() => [])
        })
        .catch((err) => {
          console.error("Error fetching categories:", err)
          return []
        }),
      fetch(`${API_BASE}/rooms`)
        .then(async (r) => {
          if (!r.ok) {
            console.warn("Failed to fetch rooms:", r.status)
            return []
          }
          return r.json().catch(() => [])
        })
        .catch((err) => {
          console.error("Error fetching rooms:", err)
          return []
        }),
    ])
      .then(([ticketsRes, categoriesRes, roomsRes]) => {
        try {
          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes.map(mapTicketFromApi).filter(Boolean)
            : []
          const mappedCategories = Array.isArray(categoriesRes)
            ? categoriesRes.map(mapCategoryFromApi).filter(Boolean)
            : []
          const mappedRooms = Array.isArray(roomsRes)
            ? roomsRes.map((r: any) => ({
                id: String(r.id),
                department_id: String(r.departmentId),
                name: r.name,
                code: r.code,
                building: r.building,
                floor: r.floor,
                created_at: r.createdAt,
                updated_at: r.updatedAt,
              }))
            : []
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          setRooms(mappedRooms)
          setError(null)
        } catch (mapErr) {
          console.error("Error mapping data:", mapErr)
          setError("Lỗi khi xử lý dữ liệu")
          setTickets([])
          setCategories([])
          setRooms([])
        }
      })
      .catch((err) => {
        console.error("Error in Promise.all:", err)
        setError("Không tải được dữ liệu")
        setTickets([])
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [user])

  // Pagination logic
  const itemsPerPage = 5
  const totalPages = useMemo(() => {
    const total = Array.isArray(tickets) ? tickets.length : 0
    const pages = Math.ceil(total / itemsPerPage)
    return isNaN(pages) || !isFinite(pages) ? 1 : Math.max(1, pages)
  }, [tickets.length])
  
  const startIndex = useMemo(() => {
    const index = (currentPage - 1) * itemsPerPage
    return Math.max(0, index)
  }, [currentPage, itemsPerPage])
  
  const endIndex = useMemo(() => {
    const total = Array.isArray(tickets) ? tickets.length : 0
    return Math.min(startIndex + itemsPerPage, total)
  }, [startIndex, itemsPerPage, tickets.length])
  
  const paginatedTickets = useMemo(() => {
    if (!Array.isArray(tickets) || tickets.length === 0) return []
    try {
      // Ensure indices are valid
      const safeStartIndex = Math.max(0, Math.min(startIndex, tickets.length - 1))
      const safeEndIndex = Math.max(safeStartIndex, Math.min(endIndex, tickets.length))
      const sliced = tickets.slice(safeStartIndex, safeEndIndex)
      return sliced
    } catch (error) {
      console.error("Error slicing tickets:", error, { startIndex, endIndex, ticketsLength: tickets.length })
      return []
    }
  }, [tickets, startIndex, endIndex])
  
  // Reset to page 1 when tickets change (only if current page is invalid)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [tickets.length, totalPages])
  
  // Ensure currentPage is valid when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage < 1) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(
    () => {
      try {
        // Backend returns enum as camelCase: "open", "inProgress", "resolved", "closed" (after JsonStringEnumConverter)
        // Or as number: 0, 1, 2, 3 (if enum not converted)
        const normalizeStatus = (status: string | number | undefined | null) => {
          if (status === undefined || status === null) return ""
          
          // Handle number (if enum serialized as number)
          if (typeof status === "number") {
            const statusMap: Record<number, string> = {
              0: "open",
              1: "inprogress",
              2: "resolved",
              3: "closed"
            }
            return statusMap[status] || ""
          }
          
          // Handle string
          if (typeof status !== "string") return ""
          
          // Normalize: remove underscores, convert to lowercase
          return status.toLowerCase().replace(/_/g, "")
        }
        
        const pendingCount = tickets.filter((t) => {
          try {
            const normalized = normalizeStatus(t?.status)
            // Match: "open", "inprogress" (from "inProgress", "InProgress", "in_progress", etc.)
            return normalized === "open" || normalized === "inprogress"
          } catch {
            return false
          }
        }).length
        
        const resolvedCount = tickets.filter((t) => {
          try {
            const normalized = normalizeStatus(t?.status)
            // Match: "resolved", "closed"
            return normalized === "resolved" || normalized === "closed"
          } catch {
            return false
          }
        }).length
        
        return {
          total: tickets.length,
          pending: pendingCount,
          resolved: resolvedCount,
        }
      } catch (error) {
        console.error("Error calculating stats:", error)
        return {
          total: tickets.length,
          pending: 0,
          resolved: 0,
        }
      }
    },
    [tickets]
  )

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError("Bạn cần đăng nhập")
      return
    }
    if (!selectedCategory) {
      setError("Vui lòng chọn danh mục")
      return
    }
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề")
      return
    }
    if (!formData.description.trim()) {
      setError("Vui lòng nhập mô tả")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const selectedCategoryObj = categories.find((c) => String(c.id) === selectedCategory)
    if (!selectedCategoryObj) {
      setError("Danh mục không hợp lệ")
      setIsSubmitting(false)
      return
    }

    // Get selected room info for location - Format: "Tòa nhà - Tầng - Phòng"
    const selectedRoomObj = selectedRoom ? rooms.find((r) => String(r.id) === selectedRoom) : null
    const locationText = selectedRoomObj 
      ? `${selectedRoomObj.building} - ${selectedRoomObj.floor} - ${selectedRoomObj.name}` 
      : selectedBuilding || ""

    const requestBody = {
      title: formData.title,
      description: formData.description,
      categoryId: selectedCategory,
      departmentId: selectedCategoryObj.department_id,
      reporterId: user.id,
      location: locationText,
    }

    console.log("=== SUBMIT TICKET ===")
    console.log("API URL:", `${API_BASE}/tickets`)
    console.log("Request body:", requestBody)
    console.log("ReporterId being sent:", requestBody.reporterId)

    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        let errorMessage = "Gửi phản ánh thất bại, vui lòng thử lại"
        try {
          const errorData = await res.json()
          console.log("Error response data:", errorData)
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          errorMessage = `Lỗi ${res.status}: ${res.statusText}`
        }
        setError(errorMessage)
        return
      }

      const ticketData = await res.json()
      console.log("Ticket created successfully:", ticketData)

      // Reset form
      setFormData({ title: "", description: "" })
      setSelectedCategory("")
      setSelectedBuilding("")
      setSelectedRoom("")
      setIsDialogOpen(false)

      // Refresh tickets list
      const ticketsRes = await fetch(`${API_BASE}/tickets?reporterId=${user.id}`)
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        setTickets(Array.isArray(ticketsData) ? ticketsData.map(mapTicketFromApi).filter(Boolean) : [])
      }

      toast({
        title: (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Gửi phản ánh thành công!</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Phản ánh của bạn đã được gửi. Chúng tôi sẽ xử lý trong thời gian sớm nhất.
              </p>
            </div>
          </div>
        ),
        className: "bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-lg",
        duration: 5000,
      })
    } catch (error) {
      console.error("Error creating ticket:", error)
      const errorMessage = error instanceof TypeError && error.message.includes("fetch")
        ? `Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.`
        : error instanceof Error
        ? error.message
        : "Gửi phản ánh thất bại, vui lòng thử lại"
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
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

          <div className="flex items-center gap-3">
            <StudentNotificationDropdown />
            <div className="flex items-center gap-2 pl-3 border-l">
              <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.full_name || "Sinh viên"}</p>
                <p className="text-xs text-muted-foreground">Student</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {error && <div className="text-sm text-red-600">{error}</div>}

        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white">
          <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.jpg')] opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-emerald-100 text-sm">Xin chào!</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{user?.full_name || "Sinh viên"}</h1>
            <p className="text-emerald-100 max-w-xl">
              Bạn có thể gửi phản ánh về cơ sở vật chất, WiFi, thiết bị tại đây. Chúng tôi sẽ xử lý trong thời gian sớm
              nhất!
            </p>

            <div className="flex flex-wrap gap-4 mt-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-emerald-100">Tổng ticket</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3">
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-emerald-100">Đang chờ</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3">
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-emerald-100">Đã xử lý</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Gửi phản ánh nhanh</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Tạo phản ánh mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tạo phản ánh mới</DialogTitle>
                  <DialogDescription>
                    Mô tả chi tiết vấn đề bạn gặp phải để chúng tôi hỗ trợ nhanh nhất
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4 mt-4" onSubmit={handleSubmitTicket}>
                  {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
                  <div className="space-y-2">
                    <Label>Danh mục *</Label>
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
                    <Label>Tiêu đề *</Label>
                    <Input
                      placeholder="VD: WiFi phòng A101 không kết nối được"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tòa nhà</Label>
                    <Select 
                      value={selectedBuilding} 
                      onValueChange={(value) => {
                        setSelectedBuilding(value)
                        setSelectedRoom("") // Reset room when building changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tòa nhà" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(rooms.map((r) => r.building))).map((building) => (
                          <SelectItem key={building} value={building}>
                            {building}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phòng</Label>
                    <Select 
                      value={selectedRoom} 
                      onValueChange={setSelectedRoom}
                      disabled={!selectedBuilding}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedBuilding ? "Chọn phòng" : "Chọn tòa nhà trước"} />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms
                          .filter((r) => r.building === selectedBuilding)
                          .map((room) => (
                            <SelectItem key={room.id} value={String(room.id)}>
                              {room.name} ({room.floor})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedRoom && (
                    <div className="space-y-2">
                      <Label>Tầng</Label>
                      <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted text-sm flex items-center">
                        {rooms.find(r => String(r.id) === selectedRoom)?.floor || "—"}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Mô tả chi tiết *</Label>
                    <Textarea
                      placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setFormData({ title: "", description: "" })
                        setSelectedCategory("")
                        setSelectedBuilding("")
                        setSelectedRoom("")
                        setError(null)
                      }}
                      disabled={isSubmitting}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                      disabled={isSubmitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Đang gửi..." : "Gửi phản ánh"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {quickCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id)
                  setIsDialogOpen(true)
                }}
                className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 text-left"
              >
                <div
                  className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-medium text-slate-900">{category.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{category.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* My Tickets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Phản ánh của tôi</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm kiếm..." className="pl-9 w-48" />
            </div>
          </div>

          <div className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Đang tải...</div>}
            {!loading && paginatedTickets.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">Chưa có phản ánh nào</h3>
                  <p className="text-sm text-muted-foreground">Tạo phản ánh mới để bắt đầu</p>
                </CardContent>
              </Card>
            )}
            {paginatedTickets.map((ticket) => {
              try {
                if (!ticket || !ticket.id) {
                  console.warn("Invalid ticket:", ticket)
                  return null
                }
                
                // Normalize status to match statusConfig keys
                // Backend returns enum as camelCase: "open", "inProgress", "resolved", "closed"
                const normalizeStatusKey = (status: string | number | undefined) => {
                  if (status === undefined || status === null) return "open"
                  
                  // Handle number (if enum serialized as number)
                  if (typeof status === "number") {
                    const statusMap: Record<number, string> = {
                      0: "open",
                      1: "in_progress",
                      2: "resolved",
                      3: "closed"
                    }
                    return statusMap[status] || "open"
                  }
                  
                  // Handle string
                  if (typeof status !== "string") return "open"
                  
                  // Normalize: remove underscores, convert to lowercase
                  const normalized = status.toLowerCase().replace(/_/g, "")
                  
                  // Map normalized to statusConfig keys
                  if (normalized === "open") return "open"
                  if (normalized === "inprogress" || normalized === "inprogress") return "in_progress"
                  if (normalized === "resolved") return "resolved"
                  if (normalized === "closed") return "closed"
                  
                  // Try direct match (for camelCase like "inProgress")
                  if (status === "inProgress") return "in_progress"
                  
                  return "open" // default
                }
                
                const statusKey = normalizeStatusKey(ticket.status) as keyof typeof statusConfig
                const status = statusConfig[statusKey] || statusConfig.open
                const StatusIcon = status.icon
                const category = categories.find((c) => String(c.id) === ticket.category_id)

                return (
                <Card
                  key={ticket.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group border-slate-200"
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setIsDetailOpen(true)
                    // Fetch comments
                    fetch(`${API_BASE}/tickets/${ticket.id}/comments`)
                      .then(r => r.ok ? r.json() : [])
                      .then(data => setTicketComments(Array.isArray(data) ? data : []))
                      .catch(() => setTicketComments([]))
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
                        <h3 className="font-medium text-slate-900 truncate">{ticket.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{ticket.location}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className={`${status.color} text-white border-0 mb-2`}>
                          {status.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              )
              } catch (error) {
                console.error("Error rendering ticket:", error, ticket)
                return null
              }
            }).filter(Boolean)}

          </div>

          {/* Pagination */}
          {!loading && tickets.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, tickets.length)} trong tổng số {tickets.length} phản ánh
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const newPage = currentPage - 1
                        if (newPage >= 1 && newPage <= totalPages) {
                          setCurrentPage(newPage)
                        }
                      }}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span className="hidden sm:block">Trước</span>
                    </Button>
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <Button
                        variant={currentPage === page ? "outline" : "ghost"}
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page)
                          }
                        }}
                        className={currentPage === page ? "font-semibold" : ""}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const newPage = currentPage + 1
                        if (newPage >= 1 && newPage <= totalPages) {
                          setCurrentPage(newPage)
                        }
                      }}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      <span className="hidden sm:block">Sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </section>

        {/* Tips Section */}
        <section className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Wifi className="w-4 h-4 text-white" />
                </div>
                Mẹo kết nối WiFi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>• Kiểm tra xem thiết bị đã bật WiFi chưa</p>
              <p>• Thử kết nối lại hoặc quên mạng rồi kết nối mới</p>
              <p>• Khởi động lại thiết bị của bạn</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                Lưu ý khi gửi phản ánh
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>• Mô tả chi tiết vấn đề gặp phải</p>
              <p>• Ghi rõ vị trí (phòng, tòa nhà)</p>
              <p>• Đính kèm hình ảnh nếu có thể</p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Dialog xem chi tiết ticket */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selectedTicket?.ticket_number}</Badge>
              {selectedTicket && (
                <Badge className={`${statusConfig[normalizeStatusKey(selectedTicket.status) as keyof typeof statusConfig]?.color || "bg-slate-500"} text-white text-xs`}>
                  {statusConfig[normalizeStatusKey(selectedTicket.status) as keyof typeof statusConfig]?.label || selectedTicket.status}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-lg">{selectedTicket?.title}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4">
              {/* Mô tả */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Mô tả vấn đề</p>
                <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedTicket?.description}</p>
              </div>

              {/* Thông tin */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>{selectedTicket?.location || "Không xác định"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span>{selectedTicket?.created_at && new Date(selectedTicket.created_at).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>{categories.find(c => String(c.id) === selectedTicket?.category_id)?.name || "Chưa phân loại"}</span>
                </div>
                {selectedTicket?.assignee && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <span>{(selectedTicket.assignee as any)?.fullName || (selectedTicket.assignee as any)?.full_name || "Đang xử lý"}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Ghi chú từ nhân viên */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Ghi chú từ nhân viên
                </p>
                {ticketComments.filter((c: any) => !c.isInternal).length > 0 ? (
                  <div className="space-y-2">
                    {ticketComments.filter((c: any) => !c.isInternal).map((comment: any) => {
                      const userName = comment.user?.fullName || comment.user?.full_name || "Nhân viên"
                      return (
                        <div key={comment.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-700">{userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt && new Date(comment.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3 bg-slate-50 rounded-lg">
                    Chưa có ghi chú từ nhân viên
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
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
