"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, Users, UserCheck, Shield, GraduationCap } from "lucide-react"
import type { UserRole, User, Department, Ticket as TicketType } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const roleLabels: Record<UserRole, string> = {
  student: "Sinh viên",
  staff: "Nhân viên",
  department_admin: "Quản trị viên",
}

const roleColors: Record<UserRole, string> = {
  student: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  staff: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  department_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

const roleIcons: Record<UserRole, typeof Users> = {
  student: GraduationCap,
  staff: UserCheck,
  department_admin: Shield,
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
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
          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes.map((t: any) => ({
                id: String(t.id),
                reporter_id: String(t.reporterId),
                assignee_id: t.assigneeId ? String(t.assigneeId) : undefined,
              }))
            : []
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

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      role: "student",
      department_id: "",
    })
    setEditingId(null)
  }

  const handleEdit = (user: (typeof users)[0]) => {
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || "",
    })
    setEditingId(user.id)
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        const response = await fetch(`${API_BASE}/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.full_name,
            email: formData.email,
            role: formData.role,
            departmentId: formData.department_id || null,
          }),
        })
        if (response.ok) {
          const updated = await response.json()
          setUsers(
            users.map((u) =>
              u.id === editingId
                ? {
                    ...u,
                    full_name: updated.fullName,
                    email: updated.email,
                    role: updated.role,
                    department_id: updated.departmentId ? String(updated.departmentId) : undefined,
                    updated_at: updated.updatedAt,
                  }
                : u,
            ),
          )
        }
      } else {
        const response = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.full_name,
            email: formData.email,
            role: formData.role,
            departmentId: formData.department_id || null,
            password: "123@", // Default password, should be changed
          }),
        })
        if (response.ok) {
          const newUser = await response.json()
          setUsers([
            ...users,
            {
              id: String(newUser.id),
              email: newUser.email,
              full_name: newUser.fullName,
              role: newUser.role,
              department_id: newUser.departmentId ? String(newUser.departmentId) : undefined,
              created_at: newUser.createdAt,
              updated_at: newUser.updatedAt,
            },
          ])
        }
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error saving user:", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa người dùng này?")) {
      try {
        const response = await fetch(`${API_BASE}/users/${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          setUsers(users.filter((u) => u.id !== id))
        }
      } catch (err) {
        console.error("Error deleting user:", err)
      }
    }
  }

  const getTicketCount = (userId: string) => {
    return tickets.filter((t) => t.reporter_id === userId || t.assignee_id === userId).length
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || user.role === filterRole
    return matchesSearch && matchesRole
  })

  // Stats
  const totalUsers = users.length
  const studentCount = users.filter((u) => u.role === "student").length
  const staffCount = users.filter((u) => u.role === "staff").length
  const adminCount = users.filter((u) => u.role === "department_admin").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý sinh viên, nhân viên và quản trị viên trong hệ thống</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm người dùng
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Vai trò *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="role">
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
                  <Label htmlFor="department">Phòng ban</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger id="department">
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
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.full_name || !formData.email}>
                {editingId ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Tất cả vai trò</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sinh viên</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground">Gửi phản ánh</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nhân viên</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffCount}</div>
            <p className="text-xs text-muted-foreground">Xử lý ticket</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quản trị viên</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">Quản lý phòng ban</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
          <CardDescription>Quản lý tài khoản và phân quyền người dùng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Lọc theo vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="student">Sinh viên</SelectItem>
                <SelectItem value="staff">Nhân viên</SelectItem>
                <SelectItem value="department_admin">Quản trị viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="hidden sm:table-cell">Phòng ban</TableHead>
                  <TableHead className="hidden lg:table-cell">Ticket</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không tìm thấy người dùng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const dept = departments.find((d) => d.id === user.department_id)
                    const RoleIcon = roleIcons[user.role]
                    const ticketCount = getTicketCount(user.id)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {user.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(-2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground md:hidden">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[user.role]}>
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {dept ? (
                            <span className="text-sm">{dept.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{ticketCount} ticket</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Chỉnh sửa</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Xóa</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
