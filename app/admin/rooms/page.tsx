"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Plus,
  Pencil,
  Trash2,
  Search,
  DoorOpen,
  Building,
  Layers,
} from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

interface Room {
  id: string
  code: string
  name: string
  building: string
  floor: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen, active: true },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

// Danh sách tòa nhà mẫu
const buildings = ["Alpha", "Beta", "Gamma", "Delta", "DE", "Hall"]
const floors = ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4", "Tầng 5", "Tầng 6", "Tầng 7", "Tầng 8"]

export default function AdminRoomsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toast } = useToast()

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBuilding, setFilterBuilding] = useState<string>("all")
  const [filterFloor, setFilterFloor] = useState<string>("all")

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    building: "",
    floor: "",
    description: "",
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/rooms`)
      if (response.ok) {
        const data = await response.json()
        setRooms(Array.isArray(data) ? data.map(mapRoomFromApi) : [])
      } else {
        // Nếu API chưa có, dùng data mẫu
        setRooms(sampleRooms)
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      setRooms(sampleRooms)
    } finally {
      setLoading(false)
    }
  }

  const mapRoomFromApi = (api: any): Room => ({
    id: String(api.id),
    code: api.code || api.Code || "",
    name: api.name || api.Name || "",
    building: api.building || api.Building || "",
    floor: api.floor || api.Floor || "",
    description: api.description || api.Description || "",
    isActive: api.isActive ?? api.IsActive ?? true,
    createdAt: api.createdAt || api.CreatedAt || new Date().toISOString(),
    updatedAt: api.updatedAt || api.UpdatedAt || new Date().toISOString(),
  })

  const handleCreate = async () => {
    if (!formData.code || !formData.name || !formData.building || !formData.floor) {
      toast({
        title: "❌ Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          building: formData.building,
          floor: formData.floor,
          description: formData.description,
          isActive: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ Thành công",
          description: "Đã thêm phòng mới",
          duration: 3000,
        })
        fetchRooms()
        setIsCreateOpen(false)
        resetForm()
      } else {
        // Fallback: thêm vào local state
        const newRoom: Room = {
          id: String(Date.now()),
          ...formData,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setRooms([...rooms, newRoom])
        toast({
          title: "✅ Thành công",
          description: "Đã thêm phòng mới (local)",
          duration: 3000,
        })
        setIsCreateOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error creating room:", error)
      // Fallback: thêm vào local state
      const newRoom: Room = {
        id: String(Date.now()),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setRooms([...rooms, newRoom])
      toast({
        title: "✅ Thành công",
        description: "Đã thêm phòng mới",
        duration: 3000,
      })
      setIsCreateOpen(false)
      resetForm()
    }
  }

  const handleEdit = async () => {
    if (!selectedRoom || !formData.code || !formData.name || !formData.building || !formData.floor) {
      toast({
        title: "❌ Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/rooms/${selectedRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRoom.id,
          code: formData.code,
          name: formData.name,
          building: formData.building,
          floor: formData.floor,
          description: formData.description,
          isActive: selectedRoom.isActive,
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ Thành công",
          description: "Đã cập nhật phòng",
          duration: 3000,
        })
        fetchRooms()
      } else {
        // Fallback: cập nhật local state
        setRooms(rooms.map(r => r.id === selectedRoom.id ? {
          ...r,
          ...formData,
          updatedAt: new Date().toISOString(),
        } : r))
        toast({
          title: "✅ Thành công",
          description: "Đã cập nhật phòng",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error updating room:", error)
      setRooms(rooms.map(r => r.id === selectedRoom.id ? {
        ...r,
        ...formData,
        updatedAt: new Date().toISOString(),
      } : r))
      toast({
        title: "✅ Thành công",
        description: "Đã cập nhật phòng",
        duration: 3000,
      })
    }
    setIsEditOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (!selectedRoom) return

    try {
      const response = await fetch(`${API_BASE}/rooms/${selectedRoom.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "✅ Thành công",
          description: "Đã xóa phòng",
          duration: 3000,
        })
        fetchRooms()
      } else {
        // Fallback: xóa từ local state
        setRooms(rooms.filter(r => r.id !== selectedRoom.id))
        toast({
          title: "✅ Thành công",
          description: "Đã xóa phòng",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error deleting room:", error)
      setRooms(rooms.filter(r => r.id !== selectedRoom.id))
      toast({
        title: "✅ Thành công",
        description: "Đã xóa phòng",
        duration: 3000,
      })
    }
    setIsDeleteOpen(false)
    setSelectedRoom(null)
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      building: "",
      floor: "",
      description: "",
    })
    setSelectedRoom(null)
  }

  const openEditDialog = (room: Room) => {
    setSelectedRoom(room)
    setFormData({
      code: room.code,
      name: room.name,
      building: room.building,
      floor: room.floor,
      description: room.description || "",
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (room: Room) => {
    setSelectedRoom(room)
    setIsDeleteOpen(true)
  }

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = 
      room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesBuilding = filterBuilding === "all" || room.building === filterBuilding
    const matchesFloor = filterFloor === "all" || room.floor === filterFloor
    return matchesSearch && matchesBuilding && matchesFloor
  })

  // Get unique buildings and floors from data
  const uniqueBuildings = [...new Set(rooms.map(r => r.building))].filter(Boolean)
  const uniqueFloors = [...new Set(rooms.map(r => r.floor))].filter(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 shadow-xl">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-200/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Helpdesk
          </span>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              logout()
              navigate("/login")
            }}
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Quản lý Phòng</h1>
              <p className="text-sm text-slate-500">Quản lý thông tin tòa nhà, tầng và phòng</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                    {user?.fullName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-700">{user?.fullName}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Tổng số phòng</p>
                    <p className="text-3xl font-bold">{rooms.length}</p>
                  </div>
                  <DoorOpen className="h-10 w-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Tòa nhà</p>
                    <p className="text-3xl font-bold">{uniqueBuildings.length}</p>
                  </div>
                  <Building className="h-10 w-10 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Số tầng</p>
                    <p className="text-3xl font-bold">{uniqueFloors.length}</p>
                  </div>
                  <Layers className="h-10 w-10 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Đang hoạt động</p>
                    <p className="text-3xl font-bold">{rooms.filter(r => r.isActive).length}</p>
                  </div>
                  <DoorOpen className="h-10 w-10 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm phòng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tòa nhà" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả tòa nhà</SelectItem>
                      {uniqueBuildings.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterFloor} onValueChange={setFilterFloor}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tầng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả tầng</SelectItem>
                      {uniqueFloors.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm phòng
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rooms Table */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách phòng</CardTitle>
              <CardDescription>
                Hiển thị {filteredRooms.length} / {rooms.length} phòng
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không tìm thấy phòng nào
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã phòng</TableHead>
                      <TableHead>Tên phòng</TableHead>
                      <TableHead>Tòa nhà</TableHead>
                      <TableHead>Tầng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Cập nhật</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-mono font-medium">{room.code}</TableCell>
                        <TableCell>{room.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Building className="h-3 w-3" />
                            {room.building}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Layers className="h-3 w-3" />
                            {room.floor}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={room.isActive ? "bg-green-500" : "bg-slate-400"}>
                            {room.isActive ? "Hoạt động" : "Ngừng"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(room.updatedAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(room)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => openDeleteDialog(room)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm phòng mới</DialogTitle>
            <DialogDescription>Nhập thông tin phòng cần thêm</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã phòng *</Label>
                <Input
                  id="code"
                  placeholder="VD: DE-101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên phòng *</Label>
                <Input
                  id="name"
                  placeholder="VD: Phòng học 101"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tòa nhà *</Label>
                <Select
                  value={formData.building}
                  onValueChange={(v) => setFormData({ ...formData, building: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tòa nhà" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tầng *</Label>
                <Select
                  value={formData.floor}
                  onValueChange={(v) => setFormData({ ...formData, floor: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tầng" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Input
                id="description"
                placeholder="Mô tả thêm về phòng..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>Thêm phòng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phòng</DialogTitle>
            <DialogDescription>Cập nhật thông tin phòng</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Mã phòng *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Tên phòng *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tòa nhà *</Label>
                <Select
                  value={formData.building}
                  onValueChange={(v) => setFormData({ ...formData, building: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tòa nhà" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tầng *</Label>
                <Select
                  value={formData.floor}
                  onValueChange={(v) => setFormData({ ...formData, floor: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tầng" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
              Hủy
            </Button>
            <Button onClick={handleEdit}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa phòng <strong>{selectedRoom?.name}</strong> ({selectedRoom?.code})?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa phòng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sample data khi chưa có API
const sampleRooms: Room[] = [
  { id: "1", code: "DE-101", name: "Phòng học 101", building: "DE", floor: "Tầng 1", description: "Phòng học lý thuyết", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "2", code: "DE-201", name: "Phòng Lab 201", building: "DE", floor: "Tầng 2", description: "Phòng thực hành máy tính", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "3", code: "DE-301", name: "Phòng họp 301", building: "DE", floor: "Tầng 3", description: "Phòng họp 20 người", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "4", code: "Alpha-101", name: "Giảng đường A1", building: "Alpha", floor: "Tầng 1", description: "Giảng đường lớn 200 chỗ", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "5", code: "Beta-201", name: "Phòng Lab B201", building: "Beta", floor: "Tầng 2", description: "Phòng thực hành điện tử", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "6", code: "Hall-001", name: "Hội trường chính", building: "Hall", floor: "Tầng 1", description: "Hội trường 500 chỗ", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

