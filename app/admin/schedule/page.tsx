"use client"

import { useMemo, useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Settings,
  LogOut,
  Search,
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  MessageSquare,
  DoorOpen,
  AlertTriangle,
} from "lucide-react"

import { useAuth } from "@/lib/auth-context"
import type { User, Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

type ShiftStatus = "scheduled" | "on_call" | "leave"

type Shift = {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string // HH:mm
  department_id: string
  staff_user_id: string
  location: string
  status: ShiftStatus
  note?: string
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays, active: true },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

const statusUi: Record<ShiftStatus, { label: string; badge: string; icon: string; cardBg: string }> = {
  scheduled: { label: "Lịch", badge: "bg-violet-100 text-violet-700 border border-violet-200", icon: "📅", cardBg: "bg-white" },
  on_call: { label: "Đang trực", badge: "bg-emerald-100 text-emerald-700 border border-emerald-300", icon: "🟢", cardBg: "bg-emerald-50 border-emerald-200" },
  leave: { label: "Nghỉ", badge: "bg-slate-200 text-slate-500 border border-slate-300", icon: "😴", cardBg: "bg-slate-50 border-slate-200 opacity-60" },
}

const SHIFT_PRESETS = {
  ca1: { label: "Ca 1", start: "08:00", end: "12:00", color: "bg-amber-500" },
  ca2: { label: "Ca 2", start: "13:00", end: "17:00", color: "bg-blue-500" },
  emergency: { label: "Khẩn cấp", start: "00:00", end: "23:59", color: "bg-red-500" },
}

function initials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "NV"
  )
}

function mapUser(api: any): User {
  return {
    id: String(api.id),
    email: api.email || "",
    full_name: api.fullName || api.full_name || "",
    role: api.role,
    department_id: api.departmentId ? String(api.departmentId) : undefined,
    created_at: api.createdAt || new Date().toISOString(),
    updated_at: api.updatedAt || new Date().toISOString(),
  }
}

function mapDepartment(api: any): Department {
  return {
    id: String(api.id),
    name: api.name || "",
    code: api.code || "",
    description: api.description || "",
    manager_id: api.managerId ? String(api.managerId) : undefined,
    created_at: api.createdAt || new Date().toISOString(),
    updated_at: api.updatedAt || new Date().toISOString(),
  }
}

export default function AdminSchedulePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const staffUsers = useMemo(() => users.filter((u) => u.role === "staff"), [users])

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  const [shifts, setShifts] = useState<Shift[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [bulkDepartment, setBulkDepartment] = useState("")
  const [bulkShiftType, setBulkShiftType] = useState<"ca1" | "ca2">("ca1")
  const [bulkStatus, setBulkStatus] = useState<ShiftStatus>("on_call")
  const [quickScheduleDept, setQuickScheduleDept] = useState("")

  const [formData, setFormData] = useState<Omit<Shift, "id">>({
    date: format(new Date(), "yyyy-MM-dd"),
    start: "08:00",
    end: "12:00",
    department_id: departments[0]?.id || "",
    staff_user_id: staffUsers[0]?.id || "",
    location: "",
    status: "scheduled",
    note: "",
  })

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/shifts`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setShifts(data.map((s: any) => {
          // Normalize time format to HH:mm
          const normalizeTime = (t: string) => {
            if (!t) return "08:00"
            // Remove seconds if present (HH:mm:ss -> HH:mm)
            return t.substring(0, 5)
          }
          return {
            id: String(s.id),
            date: s.date?.split("T")[0] || "",
            start: normalizeTime(s.start || s.startTime),
            end: normalizeTime(s.end || s.endTime),
            department_id: String(s.department_id || s.departmentId || ""),
            staff_user_id: String(s.staff_user_id || s.staffUserId || ""),
            location: s.location || "",
            status: s.status || "scheduled",
            note: s.note || "",
          }
        }))
      }
    } catch (err) {
      console.error("Error fetching shifts:", err)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/users`).then((r) => r.json()),
      fetch(`${API_BASE}/departments`).then((r) => r.json()),
    ])
      .then(([usersData, departmentsData]) => {
        setUsers(Array.isArray(usersData) ? usersData.map(mapUser) : [])
        setDepartments(Array.isArray(departmentsData) ? departmentsData.map(mapDepartment) : [])
      })
      .catch((err) => console.error("Error fetching data:", err))
      .finally(() => setLoading(false))
    
    fetchShifts()
  }, [])

  const weekStart = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7)
    return startOfWeek(base, { weekStartsOn: 1 })
  }, [weekOffset])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const shiftsForSelected = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return shifts
      .filter((s) => isSameDay(parseISO(s.date), selectedDate))
      .filter((s) => {
        if (!q) return true
        const staffName = staffUsers.find((u) => u.id === s.staff_user_id)?.full_name || ""
        const deptName = departments.find((d) => d.id === s.department_id)?.name || ""
        return (
          staffName.toLowerCase().includes(q) ||
          deptName.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          (s.note || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [shifts, selectedDate, searchQuery, staffUsers])

  const shiftCountForDay = (day: Date) => shifts.filter((s) => isSameDay(parseISO(s.date), day)).length

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const openCreate = () => {
    setFormData((prev) => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }))
    setIsCreateOpen(true)
  }

  const openEdit = (shift: Shift) => {
    setSelectedShift(shift)
    const { id: _, ...rest } = shift
    setFormData(rest)
    setIsEditOpen(true)
  }

  const upsertShift = async (mode: "create" | "edit") => {
    if (!formData.date || !formData.department_id || !formData.staff_user_id) return
    
    const payload = {
      date: formData.date,
      start: formData.start,
      end: formData.end,
      departmentId: formData.department_id,
      staffUserId: formData.staff_user_id,
      location: formData.location,
      status: formData.status,
      note: formData.note,
    }

    try {
      if (mode === "create") {
        const res = await fetch(`${API_BASE}/shifts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          await fetchShifts()
          setIsCreateOpen(false)
        }
      } else {
        if (!selectedShift) return
        const res = await fetch(`${API_BASE}/shifts/${selectedShift.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          await fetchShifts()
          setIsEditOpen(false)
          setSelectedShift(null)
        }
      }
    } catch (err) {
      console.error("Error saving shift:", err)
    }
  }

  const deleteShift = async (shift: Shift) => {
    try {
      const res = await fetch(`${API_BASE}/shifts/${shift.id}`, { method: "DELETE" })
      if (res.ok) {
        await fetchShifts()
      }
    } catch (err) {
      console.error("Error deleting shift:", err)
    }
  }

  const createBulkShifts = async () => {
    if (!bulkDepartment) return
    
    const deptStaff = staffUsers.filter(u => u.department_id === bulkDepartment)
    if (deptStaff.length === 0) return
    
    const preset = SHIFT_PRESETS[bulkShiftType]
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    
    try {
      await Promise.all(deptStaff.map(staff => 
        fetch(`${API_BASE}/shifts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateStr,
            start: preset.start,
            end: preset.end,
            departmentId: bulkDepartment,
            staffUserId: staff.id,
            location: "",
            status: bulkStatus,
            note: `${preset.label} - Tạo hàng loạt`,
          }),
        })
      ))
      await fetchShifts()
      setIsBulkCreateOpen(false)
    } catch (err) {
      console.error("Error creating bulk shifts:", err)
    }
  }

  // Get staff with their shift status for quick view
  const getStaffShiftForDay = (staffId: string, day: Date) => {
    return shifts.find(s => s.staff_user_id === staffId && isSameDay(parseISO(s.date), day))
  }

  const toggleShift = async (staff: User, day: Date, shiftType: "ca1" | "ca2" | "emergency" | "leave") => {
    const dateStr = format(day, "yyyy-MM-dd")
    const preset = shiftType !== "leave" ? SHIFT_PRESETS[shiftType] : null
    const targetTime = preset ? `${preset.start}-${preset.end}` : null
    
    // Lấy tất cả ca của nhân viên trong ngày
    const staffShiftsToday = shifts.filter(s => s.staff_user_id === staff.id && s.date === dateStr)
    
    // Tìm ca hiện tại cùng loại
    const existing = staffShiftsToday.find(s => {
      if (shiftType === "leave") return s.status === "leave"
      const shiftTime = `${s.start}-${s.end}`
      return shiftTime === targetTime
    })
    
    if (existing) {
      // Click lần 2 - tắt ca (xóa)
      await fetch(`${API_BASE}/shifts/${existing.id}`, { method: "DELETE" })
      await fetchShifts()
      return
    }
    
    // Click lần 1 - bật ca
    if (shiftType === "leave") {
      // Nếu chọn nghỉ thì xóa tất cả ca khác trước
      await Promise.all(staffShiftsToday.map(s => fetch(`${API_BASE}/shifts/${s.id}`, { method: "DELETE" })))
      
      // Tạo ca nghỉ
      await fetch(`${API_BASE}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          start: "00:00",
          end: "23:59",
          departmentId: staff.department_id,
          staffUserId: staff.id,
          location: "",
          status: "leave",
          note: "Nghỉ phép",
        }),
      })
    } else {
      // Kiểm tra nếu đang nghỉ thì xóa trạng thái nghỉ trước
      const leaveShift = staffShiftsToday.find(s => s.status === "leave")
      if (leaveShift) {
        await fetch(`${API_BASE}/shifts/${leaveShift.id}`, { method: "DELETE" })
      }
      
      // Tạo ca làm (Ca 1 hoặc Ca 2)
      await fetch(`${API_BASE}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          start: preset!.start,
          end: preset!.end,
          departmentId: staff.department_id,
          staffUserId: staff.id,
          location: "",
          status: "on_call",
          note: preset!.label,
        }),
      })
    }
    await fetchShifts()
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
              <AvatarFallback className="bg-violet-100 text-violet-700">{initials(user?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Admin"}</p>
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Quản lí lịch</h1>
              <p className="text-sm text-muted-foreground">Tạo và phân ca cho nhân viên theo phòng ban</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo nhân viên, phòng ban..."
                  className="pl-9 w-80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setIsBulkCreateOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Xếp ca phòng ban
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo ca
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>Tạo ca làm</DialogTitle>
                    <DialogDescription>Thiết lập thời gian, nhân viên và phòng ban phụ trách.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label>Ngày</Label>
                      <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Bắt đầu</Label>
                        <Input type="time" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Kết thúc</Label>
                        <Input type="time" value={formData.end} onChange={(e) => setFormData({ ...formData, end: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Phòng ban</Label>
                        <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v, staff_user_id: "" })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phòng ban" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Nhân viên</Label>
                        <Select value={formData.staff_user_id} onValueChange={(v) => setFormData({ ...formData, staff_user_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn nhân viên" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffUsers.filter((u) => u.department_id === formData.department_id).length > 0 ? (
                              staffUsers.filter((u) => u.department_id === formData.department_id).map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">Chưa có nhân viên trong phòng ban này</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Trạng thái</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ShiftStatus })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Lịch</SelectItem>
                            <SelectItem value="on_call">Trực</SelectItem>
                            <SelectItem value="leave">Nghỉ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Địa điểm</Label>
                        <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="VD: Tòa A, phòng kỹ thuật" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Ghi chú</Label>
                      <Input value={formData.note || ""} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Ghi chú (tuỳ chọn)" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Hủy
                    </Button>
                    <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => upsertShift("create")}>
                      Tạo ca
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-4">
          {/* Stats Cards */}
          {(() => {
            const dateStr = format(selectedDate, "yyyy-MM-dd")
            const dayShifts = shifts.filter(s => s.date === dateStr)
            const ca1Count = dayShifts.filter(s => `${s.start}-${s.end}` === "08:00-12:00").length
            const ca2Count = dayShifts.filter(s => `${s.start}-${s.end}` === "13:00-17:00").length
            const emergencyCount = dayShifts.filter(s => `${s.start}-${s.end}` === "00:00-23:59").length
            const leaveCount = dayShifts.filter(s => s.status === "leave").length
            const totalOnDuty = ca1Count + ca2Count + emergencyCount
            
            return (
              <div className="grid grid-cols-5 gap-3">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-emerald-100">Tổng đang trực</p>
                        <p className="text-2xl font-bold">{totalOnDuty}</p>
                      </div>
                      <Users className="h-8 w-8 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-100">Ca 1 (8h-12h)</p>
                        <p className="text-2xl font-bold">{ca1Count}</p>
                      </div>
                      <Clock className="h-8 w-8 text-amber-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-100">Ca 2 (13h-17h)</p>
                        <p className="text-2xl font-bold">{ca2Count}</p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-100">Khẩn cấp (24h)</p>
                        <p className="text-2xl font-bold">{emergencyCount}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-100">Nghỉ phép</p>
                        <p className="text-2xl font-bold">{leaveCount}</p>
                      </div>
                      <CalendarDays className="h-8 w-8 text-slate-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* Calendar Week - Nhỏ gọn */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset((v) => v - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map((day) => {
                    const active = isSameDay(day, selectedDate)
                    const count = shiftCountForDay(day)
                    const isToday = isSameDay(day, new Date())
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                          active 
                            ? "bg-violet-600 text-white shadow" 
                            : isToday 
                              ? "bg-violet-100 text-violet-700" 
                              : "hover:bg-slate-100"
                        }`}
                      >
                        <span className={`text-[10px] ${active ? "text-violet-200" : "text-muted-foreground"}`}>
                          {format(day, "EEE", { locale: vi })}
                        </span>
                        <span className="text-sm font-bold">{format(day, "dd")}</span>
                        {count > 0 && (
                          <span className={`text-[10px] px-1 rounded ${
                            active ? "bg-white/20" : "bg-violet-100 text-violet-600"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset((v) => v + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
                  Hôm nay
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Schedule - Nằm dưới */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-violet-600" />
                    Xếp ca ngày {format(selectedDate, "dd/MM", { locale: vi })}
                  </CardTitle>
                  <CardDescription>Chọn phòng ban và click vào ca để xếp lịch</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded bg-amber-500"></span> Ca 1 (8h-12h)
                    <span className="w-3 h-3 rounded bg-blue-500 ml-2"></span> Ca 2 (13h-17h)
                    <span className="w-3 h-3 rounded bg-orange-500 ml-2"></span> Khẩn cấp (24h)
                    <span className="w-3 h-3 rounded bg-slate-500 ml-2"></span> Nghỉ
                  </div>
                  <Select value={quickScheduleDept} onValueChange={setQuickScheduleDept}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Chọn phòng ban..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-violet-600" /> Xếp ca nhanh
                    </p>
                    <Select value={quickScheduleDept} onValueChange={setQuickScheduleDept}>
                      <SelectTrigger className="w-[220px] bg-white">
                        <SelectValue placeholder="Chọn phòng ban..." />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!quickScheduleDept ? (
                  <div className="text-center py-8 text-muted-foreground bg-slate-50">
                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Chọn phòng ban để xếp ca</p>
                  </div>
                ) : (
                  (() => {
                    const deptStaff = staffUsers.filter(u => u.department_id === quickScheduleDept)
                    const selectedDept = departments.find(d => d.id === quickScheduleDept)
                    
                    if (deptStaff.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50">
                          <p className="text-sm">Không có nhân viên trong phòng ban này</p>
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        <div className="bg-violet-600 text-white px-4 py-3">
                          <p className="font-semibold">{selectedDept?.name}</p>
                          <p className="text-xs text-violet-200">{deptStaff.length} nhân viên</p>
                        </div>
                        <div className="divide-y">
                          {deptStaff.map(staff => {
                            const dateStr = format(selectedDate, "yyyy-MM-dd")
                            const staffShifts = shifts.filter(s => s.staff_user_id === staff.id && s.date === dateStr)
                            const isCa1 = staffShifts.some(s => s.start === "08:00" && s.end === "12:00")
                            const isCa2 = staffShifts.some(s => s.start === "13:00" && s.end === "17:00")
                            const isEmergency = staffShifts.some(s => s.start === "00:00" && s.end === "23:59")
                            const isLeave = staffShifts.some(s => s.status === "leave")
                            
                            return (
                              <div key={staff.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 ${
                                isLeave ? "bg-orange-50" : isEmergency ? "bg-red-50" : (isCa1 && isCa2) ? "bg-emerald-100" : (isCa1 || isCa2) ? "bg-emerald-50" : ""
                              }`}>
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className={`text-xs font-bold ${
                                    isLeave ? "bg-orange-500 text-white" :
                                    isEmergency ? "bg-red-500 text-white" :
                                    (isCa1 || isCa2) ? "bg-emerald-500 text-white" :
                                    "bg-violet-100 text-violet-700"
                                  }`}>
                                    {initials(staff.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`text-sm font-medium flex-1 ${isLeave ? "text-slate-400 line-through" : ""}`}>
                                  {staff.full_name}
                                </span>
                                <div className="flex items-center gap-4">
                                  <label 
                                    className={`flex items-center gap-2 cursor-pointer select-none ${isLeave ? "opacity-40 cursor-not-allowed" : ""}`}
                                    onClick={() => !isLeave && toggleShift(staff, selectedDate, "ca1")}
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                        isCa1 
                                          ? "bg-emerald-500 border-emerald-500 shadow-md" 
                                          : "border-slate-300 bg-white hover:border-emerald-400"
                                      }`}
                                    >
                                      {isCa1 && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-sm ${isCa1 ? "font-semibold text-emerald-700" : "text-slate-600"}`}>Ca 1</span>
                                  </label>
                                  <label 
                                    className={`flex items-center gap-2 cursor-pointer select-none ${isLeave ? "opacity-40 cursor-not-allowed" : ""}`}
                                    onClick={() => !isLeave && toggleShift(staff, selectedDate, "ca2")}
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                        isCa2 
                                          ? "bg-emerald-500 border-emerald-500 shadow-md" 
                                          : "border-slate-300 bg-white hover:border-emerald-400"
                                      }`}
                                    >
                                      {isCa2 && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-sm ${isCa2 ? "font-semibold text-emerald-700" : "text-slate-600"}`}>Ca 2</span>
                                  </label>
                                  <label 
                                    className={`flex items-center gap-2 cursor-pointer select-none ${isLeave ? "opacity-40 cursor-not-allowed" : ""}`}
                                    onClick={() => !isLeave && toggleShift(staff, selectedDate, "emergency")}
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                        isEmergency 
                                          ? "bg-red-500 border-red-500 shadow-md" 
                                          : "border-slate-300 bg-white hover:border-red-400"
                                      }`}
                                    >
                                      {isEmergency && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-sm ${isEmergency ? "font-semibold text-red-700" : "text-slate-600"}`}>Khẩn cấp</span>
                                  </label>
                                  <label 
                                    className="flex items-center gap-2 cursor-pointer select-none"
                                    onClick={() => toggleShift(staff, selectedDate, "leave")}
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                        isLeave 
                                          ? "bg-orange-500 border-orange-500 shadow-md" 
                                          : "border-slate-300 bg-white hover:border-orange-400"
                                      }`}
                                    >
                                      {isLeave && (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`text-sm ${isLeave ? "font-semibold text-orange-700" : "text-slate-600"}`}>Nghỉ</span>
                                  </label>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Create Dialog */}
          <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Xếp ca cho cả phòng ban</DialogTitle>
                <DialogDescription>
                  Tạo ca làm cho tất cả nhân viên trong phòng ban vào ngày {format(selectedDate, "dd/MM/yyyy", { locale: vi })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Phòng ban</Label>
                  <Select value={bulkDepartment} onValueChange={setBulkDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phòng ban" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({staffUsers.filter(u => u.department_id === d.id).length} NV)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Chọn ca</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBulkShiftType("ca1")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        bulkShiftType === "ca1" 
                          ? "border-amber-500 bg-amber-50" 
                          : "border-slate-200 hover:border-amber-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${SHIFT_PRESETS.ca1.color}`}></div>
                      <p className="font-bold">Ca 1</p>
                      <p className="text-xs text-muted-foreground">8:00 - 12:00</p>
                    </button>
                    <button
                      onClick={() => setBulkShiftType("ca2")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        bulkShiftType === "ca2" 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${SHIFT_PRESETS.ca2.color}`}></div>
                      <p className="font-bold">Ca 2</p>
                      <p className="text-xs text-muted-foreground">13:00 - 17:00</p>
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Trạng thái</Label>
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ShiftStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_call">🟢 Đang trực</SelectItem>
                      <SelectItem value="scheduled">📅 Lịch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {bulkDepartment && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Sẽ tạo ca cho <strong>{staffUsers.filter(u => u.department_id === bulkDepartment).length}</strong> nhân viên
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkCreateOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  className="bg-violet-600 hover:bg-violet-700" 
                  onClick={createBulkShifts}
                  disabled={!bulkDepartment}
                >
                  Tạo ca cho cả phòng ban
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Sửa ca làm</DialogTitle>
                <DialogDescription>Cập nhật thông tin ca đã tạo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Ngày</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Bắt đầu</Label>
                    <Input type="time" value={formData.start} onChange={(e) => setFormData({ ...formData, start: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Kết thúc</Label>
                    <Input type="time" value={formData.end} onChange={(e) => setFormData({ ...formData, end: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Phòng ban</Label>
                    <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v, staff_user_id: "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phòng ban" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nhân viên</Label>
                    <Select value={formData.staff_user_id} onValueChange={(v) => setFormData({ ...formData, staff_user_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhân viên" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffUsers.filter((u) => u.department_id === formData.department_id).length > 0 ? (
                          staffUsers.filter((u) => u.department_id === formData.department_id).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">Chưa có nhân viên trong phòng ban này</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Trạng thái</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ShiftStatus })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Lịch</SelectItem>
                        <SelectItem value="on_call">Trực</SelectItem>
                        <SelectItem value="leave">Nghỉ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Địa điểm</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Ghi chú</Label>
                  <Input value={formData.note || ""} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Hủy
                </Button>
                <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => upsertShift("edit")}>
                  Lưu
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

