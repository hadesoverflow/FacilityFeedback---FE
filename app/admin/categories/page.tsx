"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
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
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  AlertCircle,
  DoorOpen,
} from "lucide-react"
import type { FeedbackCategory, TicketPriority, Department, Ticket as TicketType } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen, active: true },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

const priorityLabels: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "bg-slate-500" },
  medium: { label: "Trung bình", color: "bg-blue-500" },
  high: { label: "Cao", color: "bg-orange-500" },
  critical: { label: "Khẩn cấp", color: "bg-red-500" },
}

export default function CategoriesPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tickets, setTickets] = useState<Array<{ id: string; category_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setLoading(true)
    Promise.all([
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
      fetch(`${API_BASE}/tickets`)
        .then(async (r) => {
          if (!r.ok) return []
          const data = await r.json().catch(() => [])
          return Array.isArray(data) ? data : []
        })
        .catch(() => []),
    ])
      .then(([categoriesRes, departmentsRes, ticketsRes]) => {
        try {
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
          const mappedTickets: Array<{ id: string; category_id: string }> = Array.isArray(ticketsRes)
            ? ticketsRes
                .filter((t: any) => t && t.id != null && t.categoryId != null)
                .map((t: any) => ({
                  id: String(t.id),
                  category_id: String(t.categoryId),
                }))
            : []
          setCategories(mappedCategories)
          setDepartments(mappedDepartments)
          setTickets(mappedTickets)
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    department_id: "",
    sla_response_hours: 4,
    sla_resolution_hours: 24,
    priority_default: "medium" as TicketPriority,
    is_active: true,
  })

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          departmentId: formData.department_id,
          slaResponseHours: formData.sla_response_hours,
          slaResolutionHours: formData.sla_resolution_hours,
          priorityDefault: formData.priority_default,
          isActive: formData.is_active,
        }),
      })
      if (response.ok) {
        const newCategory = await response.json()
        setCategories([
          ...categories,
          {
            id: String(newCategory.id),
            name: newCategory.name,
            code: newCategory.code,
            description: newCategory.description,
            department_id: String(newCategory.departmentId),
            sla_response_hours: newCategory.slaResponseHours,
            sla_resolution_hours: newCategory.slaResolutionHours,
            priority_default: newCategory.priorityDefault,
            is_active: newCategory.isActive,
            created_at: newCategory.createdAt,
            updated_at: newCategory.updatedAt,
          },
        ])
        setIsCreateOpen(false)
        resetForm()
        toast({ title: "Thành công", description: "Đã tạo danh mục mới" })
      } else {
        toast({ title: "Lỗi", description: "Không thể tạo danh mục", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error creating category:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi tạo danh mục", variant: "destructive" })
    }
  }

  const handleEdit = async () => {
    if (!selectedCategory) return
    try {
      const response = await fetch(`${API_BASE}/categories/${selectedCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          departmentId: formData.department_id,
          slaResponseHours: formData.sla_response_hours,
          slaResolutionHours: formData.sla_resolution_hours,
          priorityDefault: formData.priority_default,
          isActive: formData.is_active,
        }),
      })
      if (response.ok) {
        const updated = await response.json()
        setCategories(
          categories.map((cat) =>
            cat.id === selectedCategory.id
              ? {
                  ...cat,
                  name: updated.name,
                  code: updated.code,
                  description: updated.description,
                  department_id: String(updated.departmentId),
                  sla_response_hours: updated.slaResponseHours,
                  sla_resolution_hours: updated.slaResolutionHours,
                  priority_default: updated.priorityDefault,
                  is_active: updated.isActive,
                  updated_at: updated.updatedAt,
                }
              : cat,
          ),
        )
        setIsEditOpen(false)
        setSelectedCategory(null)
        resetForm()
        toast({ title: "Thành công", description: "Đã cập nhật danh mục" })
      } else {
        toast({ title: "Lỗi", description: "Không thể cập nhật danh mục", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error updating category:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi cập nhật danh mục", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return
    try {
      const response = await fetch(`${API_BASE}/categories/${selectedCategory.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setCategories(categories.filter((cat) => cat.id !== selectedCategory.id))
        setIsDeleteOpen(false)
        setSelectedCategory(null)
        toast({ title: "Thành công", description: "Đã xóa danh mục" })
      } else {
        toast({ title: "Lỗi", description: "Không thể xóa danh mục", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error deleting category:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi xóa danh mục", variant: "destructive" })
    }
  }

  const openEdit = (category: FeedbackCategory) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || "",
      department_id: category.department_id,
      sla_response_hours: category.sla_response_hours,
      sla_resolution_hours: category.sla_resolution_hours,
      priority_default: category.priority_default,
      is_active: category.is_active,
    })
    setIsEditOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      department_id: "",
      sla_response_hours: 4,
      sla_resolution_hours: 24,
      priority_default: "medium",
      is_active: true,
    })
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getTicketCount = (categoryId: string) => {
    return tickets.filter((t) => t.category_id === categoryId).length
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
              <h1 className="text-xl font-semibold">Quản lý Danh mục</h1>
              <p className="text-sm text-muted-foreground">CRUD feedback category với cấu hình SLA</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm danh mục..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm danh mục
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Thêm danh mục mới</DialogTitle>
                    <DialogDescription>Tạo danh mục phản ánh mới với cấu hình SLA</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tên danh mục</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="VD: Sự cố WiFi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mã danh mục</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="VD: WIFI"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Mô tả chi tiết danh mục..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phòng ban phụ trách</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phòng ban" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          SLA Phản hồi (giờ)
                        </Label>
                        <Input
                          type="number"
                          value={formData.sla_response_hours}
                          onChange={(e) => setFormData({ ...formData, sla_response_hours: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          SLA Xử lý (giờ)
                        </Label>
                        <Input
                          type="number"
                          value={formData.sla_resolution_hours}
                          onChange={(e) => setFormData({ ...formData, sla_resolution_hours: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Độ ưu tiên mặc định</Label>
                        <Select
                          value={formData.priority_default}
                          onValueChange={(value: TicketPriority) =>
                            setFormData({ ...formData, priority_default: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trạng thái</Label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          />
                          <span className="text-sm">{formData.is_active ? "Hoạt động" : "Tạm dừng"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700">
                      Tạo danh mục
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danh sách danh mục ({filteredCategories.length})</CardTitle>
              <CardDescription>Quản lý các loại phản ánh và cấu hình SLA tương ứng</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>SLA Phản hồi</TableHead>
                    <TableHead>SLA Xử lý</TableHead>
                    <TableHead>Độ ưu tiên</TableHead>
                    <TableHead>Số ticket</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Chưa có danh mục nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => {
                      try {
                        const department = departments.find((d) => d.id === category.department_id)
                        const priority = priorityLabels[category.priority_default] || priorityLabels.medium
                        const ticketCount = getTicketCount(category.id)

                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.code}</Badge>
                        </TableCell>
                        <TableCell>{department?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category.sla_response_hours}h</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category.sla_resolution_hours}h</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priority.color} text-white`}>{priority.label}</Badge>
                        </TableCell>
                        <TableCell>{ticketCount}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(category)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedCategory(category)
                                  setIsDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                      } catch (err) {
                        console.error("Error rendering category row:", err, category)
                        return null
                      }
                    }).filter(Boolean)
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>Cập nhật thông tin danh mục phản ánh</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên danh mục</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mã danh mục</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phòng ban phụ trách</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name || "-"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Chưa có phòng ban
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SLA Phản hồi (giờ)</Label>
                <Input
                  type="number"
                  value={formData.sla_response_hours}
                  onChange={(e) => setFormData({ ...formData, sla_response_hours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>SLA Xử lý (giờ)</Label>
                <Input
                  type="number"
                  value={formData.sla_resolution_hours}
                  onChange={(e) => setFormData({ ...formData, sla_resolution_hours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Độ ưu tiên mặc định</Label>
                <Select
                  value={formData.priority_default}
                  onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority_default: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <span className="text-sm">{formData.is_active ? "Hoạt động" : "Tạm dừng"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} className="bg-violet-600 hover:bg-violet-700">
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa danh mục "{selectedCategory?.name}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
