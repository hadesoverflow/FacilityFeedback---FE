"use client"

import { useEffect, useMemo, useState } from "react"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
  ChevronDown,
  ChevronRight,
  Mail,
  GraduationCap,
  UserCheck,
  Shield,
  DoorOpen,
} from "lucide-react"
import type { User, Department, Ticket as TicketType, UserRole } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users, active: true },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

const roleLabels: Record<UserRole, string> = {
  student: "Sinh viên",
  staff: "Nhân viên",
  department_admin: "Quản trị viên",
}

const roleColors: Record<UserRole, string> = {
  student: "bg-blue-100 text-blue-800",
  staff: "bg-emerald-100 text-emerald-800",
  department_admin: "bg-purple-100 text-purple-800",
}

const roleIcons: Record<UserRole, typeof Users> = {
  student: GraduationCap,
  staff: UserCheck,
  department_admin: Shield,
}

export default function UsersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tickets, setTickets] = useState<Array<{ id: string; reporter_id: string; assignee_id?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "student" as UserRole,
    department_id: "",
  })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/users`)
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
      .then(([usersRes, departmentsRes, ticketsRes]) => {
        try {
          console.log("Raw users response from API:", usersRes)
          const mappedUsers = Array.isArray(usersRes)
            ? usersRes.map((u: any) => {
                console.log("Processing user:", u.email, "Role:", u.role, "RoleId:", u.roleId)
                // Normalize role - backend returns enum as camelCase: "student", "staff", "departmentAdmin"
                // or PascalCase: "Student", "Staff", "DepartmentAdmin"
                let normalizedRole = u.role
                if (typeof u.role === "string") {
                  const roleStr = String(u.role).trim()
                  const roleLower = roleStr.toLowerCase()
                  
                  // Handle camelCase: "departmentAdmin" -> "department_admin"
                  if (roleLower === "student" || roleStr === "Student") {
                    normalizedRole = "student"
                  } else if (roleLower === "staff" || roleStr === "Staff") {
                    normalizedRole = "staff"
                  } else if (
                    roleLower === "departmentadmin" || 
                    roleStr === "DepartmentAdmin" || 
                    roleStr === "departmentAdmin"
                  ) {
                    normalizedRole = "department_admin"
                  } else {
                    // Fallback: keep original or default to student
                    console.warn(`Unknown role format: ${roleStr}`, u)
                    normalizedRole = roleLower || "student"
                  }
                } else if (typeof u.role === "number") {
                  // Handle numeric enum: 0=Student, 1=Staff, 2=DepartmentAdmin
                  normalizedRole = u.role === 0 ? "student" : u.role === 1 ? "staff" : u.role === 2 ? "department_admin" : "student"
                  console.log(`  -> Normalized from number ${u.role} to: ${normalizedRole}`)
                } else if (u.roleId !== undefined) {
                  // Handle roleId from DB: 1=Student, 2=Staff, 3=DepartmentAdmin
                  const roleId = typeof u.roleId === "number" ? u.roleId : parseInt(String(u.roleId), 10)
                  normalizedRole = roleId === 1 ? "student" : roleId === 2 ? "staff" : roleId === 3 ? "department_admin" : "student"
                  console.log(`  -> Normalized from roleId ${roleId} to: ${normalizedRole}`)
                } else {
                  // No role found, default to student
                  console.warn(`User missing role:`, u)
                  normalizedRole = "student"
                }
                
                console.log(`  -> Final normalized role: ${normalizedRole}`)
                
                let departmentId: string | undefined = undefined
                if (u.departmentId !== null && u.departmentId !== undefined) {
                  const deptIdStr = String(u.departmentId).trim()
                  if (deptIdStr !== "" && deptIdStr !== "null" && deptIdStr !== "undefined" && deptIdStr.toLowerCase() !== "null") {
                    departmentId = deptIdStr
                  }
                }
                
                return {
                  id: String(u.id),
                  email: u.email || "",
                  full_name: u.fullName || "",
                  role: normalizedRole,
                  department_id: departmentId,
                  created_at: u.createdAt,
                  updated_at: u.updatedAt,
                }
              })
            : []
          const mappedDepartments = Array.isArray(departmentsRes)
            ? departmentsRes.map((d: any) => ({
                id: String(d.id),
                name: d.name || "",
                code: d.code || "",
                description: d.description || "",
                manager_id: d.managerId ? String(d.managerId).trim() : undefined,
                created_at: d.createdAt,
                updated_at: d.updatedAt,
              }))
            : []
          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes
                .filter((t: any) => t && t.id != null)
                .map((t: any) => ({
                  id: String(t.id),
                  reporter_id: String(t.reporterId),
                  assignee_id: t.assigneeId ? String(t.assigneeId) : undefined,
                }))
            : []
          
          console.log("Mapped users:", mappedUsers)
          console.log("User roles breakdown:", {
            student: mappedUsers.filter(u => u.role === "student").length,
            staff: mappedUsers.filter(u => u.role === "staff").length,
            department_admin: mappedUsers.filter(u => u.role === "department_admin").length,
          })
          console.log("Filtered users count:", filteredUsers.length)
          console.log("Filter role:", filterRole)
          console.log("Sample filtered users (first 3):", filteredUsers.slice(0, 3).map(u => ({ email: u.email, role: u.role })))
          setUsers(mappedUsers)
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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = filterRole === "all" || user.role === filterRole
      
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, filterRole])
  
  // Pagination logic
  const itemsPerPage = 10
  const totalPages = useMemo(() => {
    const total = Array.isArray(filteredUsers) ? filteredUsers.length : 0
    const pages = Math.ceil(total / itemsPerPage)
    return isNaN(pages) || !isFinite(pages) ? 1 : Math.max(1, pages)
  }, [filteredUsers.length])
  
  const startIndex = useMemo(() => {
    const index = (currentPage - 1) * itemsPerPage
    return Math.max(0, index)
  }, [currentPage, itemsPerPage])
  
  const endIndex = useMemo(() => {
    const total = Array.isArray(filteredUsers) ? filteredUsers.length : 0
    return Math.min(startIndex + itemsPerPage, total)
  }, [startIndex, itemsPerPage, filteredUsers.length])
  
  const paginatedUsers = useMemo(() => {
    if (!Array.isArray(filteredUsers) || filteredUsers.length === 0) return []
    try {
      // Ensure indices are valid
      const safeStartIndex = Math.max(0, Math.min(startIndex, filteredUsers.length - 1))
      const safeEndIndex = Math.max(safeStartIndex, Math.min(endIndex, filteredUsers.length))
      return filteredUsers.slice(safeStartIndex, safeEndIndex)
    } catch (error) {
      console.error("Error slicing filteredUsers for pagination:", error)
      return []
    }
  }, [filteredUsers, startIndex, endIndex])
  
  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterRole, searchQuery])
  
  // Ensure currentPage is valid when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredUsers.length, totalPages])
  
  // Ensure currentPage is valid when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage < 1) {
      setCurrentPage(1)
    }
  }, [totalPages])

  // Stats
  const totalUsers = users.length
  const studentCount = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "student"
  }).length
  const staffCount = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "staff"
  }).length
  const adminCount = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "department_admin" || roleStr === "departmentadmin"
  }).length

  const getTicketCount = (userId: string) => {
    return tickets.filter((t) => t.reporter_id === userId || t.assignee_id === userId).length
  }

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      role: "student",
      department_id: "",
    })
    setSelectedUser(null)
  }

  const handleCreate = async () => {
    try {
      // Map role from frontend format to backend enum format
      const roleMap: Record<UserRole, string> = {
        student: "Student",
        staff: "Staff",
        department_admin: "DepartmentAdmin",
      }
      
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.full_name,
          email: formData.email,
          role: roleMap[formData.role] || "Student",
          departmentId: formData.department_id || null,
          password: "123@", // Default password
        }),
      })
      if (response.ok) {
        const newUser = await response.json()
        // Normalize role
        let normalizedRole = newUser.role
        if (typeof newUser.role === "string") {
          const roleLower = newUser.role.toLowerCase()
          if (roleLower === "student") {
            normalizedRole = "student"
          } else if (roleLower === "staff") {
            normalizedRole = "staff"
          } else if (roleLower === "departmentadmin" || newUser.role === "DepartmentAdmin") {
            normalizedRole = "department_admin"
          }
        }
        
        setUsers([
          ...users,
          {
            id: String(newUser.id),
            email: newUser.email,
            full_name: newUser.fullName,
            role: normalizedRole,
            department_id: newUser.departmentId ? String(newUser.departmentId) : undefined,
            created_at: newUser.createdAt,
            updated_at: newUser.updatedAt,
          },
        ])
        setIsCreateOpen(false)
        resetForm()
        toast({ title: "Thành công", description: "Đã tạo người dùng mới" })
      } else {
        toast({ title: "Lỗi", description: "Không thể tạo người dùng", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error creating user:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi tạo người dùng", variant: "destructive" })
    }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    try {
      // Map role from frontend format to backend enum format
      const roleMap: Record<UserRole, string> = {
        student: "Student",
        staff: "Staff",
        department_admin: "DepartmentAdmin",
      }
      
      const response = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.full_name,
          email: formData.email,
          role: roleMap[formData.role] || "Student",
          departmentId: formData.department_id || null,
        }),
      })
      if (response.ok) {
        const updated = await response.json()
        // Normalize role
        let normalizedRole = updated.role
        if (typeof updated.role === "string") {
          const roleLower = updated.role.toLowerCase()
          if (roleLower === "student") {
            normalizedRole = "student"
          } else if (roleLower === "staff") {
            normalizedRole = "staff"
          } else if (roleLower === "departmentadmin" || updated.role === "DepartmentAdmin") {
            normalizedRole = "department_admin"
          }
        }
        
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  full_name: updated.fullName,
                  email: updated.email,
                  role: normalizedRole,
                  department_id: updated.departmentId ? String(updated.departmentId) : undefined,
                  updated_at: updated.updatedAt,
                }
              : u,
          ),
        )
        setIsEditOpen(false)
        resetForm()
        toast({ title: "Thành công", description: "Đã cập nhật người dùng" })
      } else {
        toast({ title: "Lỗi", description: "Không thể cập nhật người dùng", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error updating user:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi cập nhật người dùng", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      const response = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setUsers(users.filter((u) => u.id !== selectedUser.id))
        setIsDeleteOpen(false)
        setSelectedUser(null)
        toast({ title: "Thành công", description: "Đã xóa người dùng" })
      } else {
        toast({ title: "Lỗi", description: "Không thể xóa người dùng", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error deleting user:", err)
      toast({ title: "Lỗi", description: "Đã xảy ra lỗi khi xóa người dùng", variant: "destructive" })
    }
  }

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || "",
    })
    setIsEditOpen(true)
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
              <AvatarFallback className="bg-violet-100 text-violet-700">
                {user?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "AD"}
              </AvatarFallback>
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
              <h1 className="text-xl font-semibold">Quản lý Người dùng</h1>
              <p className="text-sm text-muted-foreground">CRUD sinh viên, nhân viên và quản trị viên</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm người dùng..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="student">Sinh viên</SelectItem>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                  <SelectItem value="department_admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => resetForm()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm người dùng
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm người dùng mới</DialogTitle>
                    <DialogDescription>Tạo tài khoản người dùng mới trong hệ thống</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Họ và tên *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vai trò *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Sinh viên
                            </div>
                          </SelectItem>
                          <SelectItem value="staff">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              Nhân viên
                            </div>
                          </SelectItem>
                          <SelectItem value="department_admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Quản trị viên
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.role !== "student" && (
                      <div className="space-y-2">
                        <Label>Phòng ban</Label>
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
                                {dept.name} ({dept.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700" disabled={!formData.full_name || !formData.email}>
                      Tạo người dùng
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Tổng người dùng</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{studentCount}</p>
                    <p className="text-sm text-muted-foreground">Sinh viên</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staffCount}</p>
                    <p className="text-sm text-muted-foreground">Nhân viên</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{adminCount}</p>
                    <p className="text-sm text-muted-foreground">Quản trị viên</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danh sách người dùng ({filteredUsers.length})</CardTitle>
              <CardDescription>Quản lý tài khoản và phân quyền người dùng trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy người dùng nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => {
                      const dept = departments.find((d) => d.id === user.department_id)
                      const RoleIcon = roleIcons[user.role]
                      const ticketCount = getTicketCount(user.id)
                      const isExpanded = expandedUsers.has(user.id)

                      return (
                        <>
                          <TableRow key={user.id}>
                            <TableCell>
                              <Collapsible open={isExpanded} onOpenChange={() => toggleUser(user.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className={`text-sm ${roleColors[user.role]}`}>
                                    {user.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.full_name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const roleKey = user.role as UserRole
                                const IconComponent = roleIcons[roleKey] || Users
                                const label = roleLabels[roleKey] || user.role
                                const color = roleColors[roleKey] || "bg-gray-100 text-gray-800"
                                
                                // Debug log if role not found
                                if (!roleIcons[roleKey] || !roleLabels[roleKey]) {
                                  console.warn(`Missing role mapping for: ${user.role}`, {
                                    availableKeys: Object.keys(roleIcons),
                                    userRole: user.role,
                                    userEmail: user.email
                                  })
                                }
                                
                                return (
                                  <Badge variant="secondary" className={color}>
                                    <IconComponent className="mr-1 h-3 w-3" />
                                    {label}
                                  </Badge>
                                )
                              })()}
                            </TableCell>
                            <TableCell>
                              {dept ? (
                                <span className="text-sm">{dept.name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{ticketCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="cursor-pointer"
                                    onSelect={(e) => {
                                      e.preventDefault()
                                      openEdit(user)
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer"
                                    onSelect={(e) => {
                                      e.preventDefault()
                                      setSelectedUser(user)
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
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-slate-50 p-0">
                                <div className="py-4 px-6">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Thông tin chi tiết
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Email</p>
                                      <p className="text-sm font-medium">{user.email}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Vai trò</p>
                                      {(() => {
                                        const roleKey = user.role as UserRole
                                        const IconComponent = roleIcons[roleKey] || Users
                                        const label = roleLabels[roleKey] || user.role
                                        const color = roleColors[roleKey] || "bg-gray-100 text-gray-800"
                                        
                                        return (
                                          <Badge variant="secondary" className={color}>
                                            <IconComponent className="mr-1 h-3 w-3" />
                                            {label}
                                          </Badge>
                                        )
                                      })()}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Phòng ban</p>
                                      <p className="text-sm font-medium">{dept ? dept.name : "-"}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Số ticket</p>
                                      <p className="text-sm font-medium">{ticketCount}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Ngày tạo</p>
                                      <p className="text-sm font-medium">
                                        {new Date(user.created_at).toLocaleDateString("vi-VN")}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">Cập nhật lần cuối</p>
                                      <p className="text-sm font-medium">
                                        {new Date(user.updated_at).toLocaleDateString("vi-VN")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {!loading && filteredUsers.length > 0 && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} trong tổng số {filteredUsers.length} người dùng
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
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>Cập nhật thông tin người dùng</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Họ và tên *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vai trò *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Sinh viên
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Nhân viên
                    </div>
                  </SelectItem>
                  <SelectItem value="department_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Quản trị viên
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role !== "student" && (
              <div className="space-y-2">
                <Label>Phòng ban</Label>
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
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEdit} className="bg-violet-600 hover:bg-violet-700" disabled={!formData.full_name || !formData.email}>
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
              Bạn có chắc chắn muốn xóa người dùng "{selectedUser?.full_name}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa người dùng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

