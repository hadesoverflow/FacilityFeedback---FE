"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Users, Ticket } from "lucide-react"
import type { Department, User, Ticket as TicketType } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager_id: "",
  })

  useEffect(() => {
    setLoading(true)
    Promise.all([
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
      fetch(`${API_BASE}/tickets`)
        .then(async (r) => {
          if (!r.ok) return []
          const data = await r.json().catch(() => [])
          return Array.isArray(data) ? data : []
        })
        .catch(() => []),
    ])
      .then(([departmentsRes, usersRes, ticketsRes]) => {
        try {
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
          const mappedTickets = Array.isArray(ticketsRes)
            ? ticketsRes.map((t: any) => ({
                id: String(t.id),
                department_id: String(t.departmentId),
              }))
            : []
          setDepartments(mappedDepartments)
          setUsers(mappedUsers)
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

  const staffUsers = users.filter((u) => u.role !== "student")

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      manager_id: "",
    })
    setEditingId(null)
  }

  const handleEdit = (dept: (typeof departments)[0]) => {
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      manager_id: dept.manager_id || "",
    })
    setEditingId(dept.id)
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        const response = await fetch(`${API_BASE}/departments/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            managerId: formData.manager_id || null,
          }),
        })
        if (response.ok) {
          const updated = await response.json()
          setDepartments(
            departments.map((d) =>
              d.id === editingId
                ? {
                    ...d,
                    name: updated.name,
                    code: updated.code,
                    description: updated.description,
                    manager_id: updated.managerId ? String(updated.managerId) : undefined,
                    updated_at: updated.updatedAt,
                  }
                : d,
            ),
          )
        }
      } else {
        const response = await fetch(`${API_BASE}/departments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            managerId: formData.manager_id || null,
          }),
        })
        if (response.ok) {
          const newDept = await response.json()
          setDepartments([
            ...departments,
            {
              id: String(newDept.id),
              name: newDept.name,
              code: newDept.code,
              description: newDept.description,
              manager_id: newDept.managerId ? String(newDept.managerId) : undefined,
              created_at: newDept.createdAt,
              updated_at: newDept.updatedAt,
            },
          ])
        }
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error saving department:", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa phòng ban này?")) {
      try {
        const response = await fetch(`${API_BASE}/departments/${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          setDepartments(departments.filter((d) => d.id !== id))
        }
      } catch (err) {
        console.error("Error deleting department:", err)
      }
    }
  }

  const getStaffCount = (deptId: string) => {
    return users.filter((u) => u.department_id === deptId).length
  }

  const getTicketCount = (deptId: string) => {
    return tickets.filter((t) => t.department_id === deptId).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phòng / Bộ phận</h1>
          <p className="text-muted-foreground">Quản lý các phòng ban phụ trách xử lý ticket</p>
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
              Thêm phòng ban
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên phòng ban *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Phòng CNTT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: CNTT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chức năng phòng ban..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Trưởng phòng</Label>
                <Select
                  value={formData.manager_id}
                  onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trưởng phòng" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit}>{editingId ? "Cập nhật" : "Thêm mới"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên phòng ban</TableHead>
                <TableHead>Trưởng phòng</TableHead>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chưa có phòng ban nào
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => {
                  const manager = users.find((u) => u.id === dept.manager_id)
                return (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono text-sm">{dept.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{manager?.full_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getStaffCount(dept.id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getTicketCount(dept.id)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
