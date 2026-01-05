"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Clock } from "lucide-react"
import { PriorityBadge } from "@/components/tickets/priority-badge"
import type { TicketPriority, FeedbackCategory, Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
    ])
      .then(([categoriesRes, departmentsRes]) => {
        try {
          const mappedCategories = Array.isArray(categoriesRes)
            ? categoriesRes
                .map((c: any) => {
                  try {
                    if (!c || !c.id) return null
                    return {
                      id: String(c.id),
                      name: c.name || "",
                      code: c.code || "",
                      description: c.description || "",
                      department_id: String(c.departmentId || ""),
                      sla_response_hours: c.slaResponseHours || 0,
                      sla_resolution_hours: c.slaResolutionHours || 0,
                      priority_default: (c.priorityDefault || "medium") as TicketPriority,
                      is_active: c.isActive !== undefined ? c.isActive : true,
                      created_at: c.createdAt || new Date().toISOString(),
                      updated_at: c.updatedAt || new Date().toISOString(),
                    }
                  } catch (err) {
                    console.error("Error mapping category:", err, c)
                    return null
                  }
                })
                .filter((c): c is FeedbackCategory => c !== null)
            : []
          const mappedDepartments = Array.isArray(departmentsRes)
            ? departmentsRes
                .map((d: any) => {
                  try {
                    if (!d || !d.id) return null
                    return {
                      id: String(d.id),
                      name: d.name || "",
                      code: d.code || "",
                      description: d.description || "",
                      manager_id: d.managerId ? String(d.managerId) : undefined,
                      created_at: d.createdAt || new Date().toISOString(),
                      updated_at: d.updatedAt || new Date().toISOString(),
                    }
                  } catch (err) {
                    console.error("Error mapping department:", err, d)
                    return null
                  }
                })
                .filter((d): d is Department => d !== null)
            : []
          setCategories(mappedCategories)
          setDepartments(mappedDepartments)
        } catch (err) {
          console.error("Error mapping data:", err)
          setCategories([])
          setDepartments([])
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
      name: "",
      code: "",
      description: "",
      department_id: "",
      sla_response_hours: 4,
      sla_resolution_hours: 24,
      priority_default: "medium",
      is_active: true,
    })
    setEditingId(null)
  }

  const handleEdit = (category: (typeof categories)[0]) => {
    try {
      setFormData({
        name: category.name || "",
        code: category.code || "",
        description: category.description || "",
        department_id: category.department_id || "",
        sla_response_hours: category.sla_response_hours || 0,
        sla_resolution_hours: category.sla_resolution_hours || 0,
        priority_default: (category.priority_default || "medium") as TicketPriority,
        is_active: category.is_active !== undefined ? category.is_active : true,
      })
      setEditingId(category.id)
      setIsDialogOpen(true)
    } catch (err) {
      console.error("Error editing category:", err, category)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        const response = await fetch(`${API_BASE}/categories/${editingId}`, {
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
            categories.map((c) =>
              c.id === editingId
                ? {
                    ...c,
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
                : c,
            ),
          )
        }
      } else {
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
        }
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error saving category:", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa danh mục này?")) {
      try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          setCategories(categories.filter((c) => c.id !== id))
        }
      } catch (err) {
        console.error("Error deleting category:", err)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Danh mục phản ánh</h1>
            <p className="text-muted-foreground">Quản lý các loại sự cố và cấu hình SLA</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh mục phản ánh</h1>
          <p className="text-muted-foreground">Quản lý các loại sự cố và cấu hình SLA</p>
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
              Thêm danh mục
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên danh mục *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Sự cố WiFi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã *</Label>
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
                  placeholder="Mô tả loại sự cố..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Phòng phụ trách *</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban" />
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
                  <Label>SLA phản hồi (giờ)</Label>
                  <Input
                    type="number"
                    value={formData.sla_response_hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sla_response_hours: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>SLA xử lý (giờ)</Label>
                  <Input
                    type="number"
                    value={formData.sla_resolution_hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sla_resolution_hours: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

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
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="critical">Khẩn cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Kích hoạt</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
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
                <TableHead>Tên danh mục</TableHead>
                <TableHead>Phòng phụ trách</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Độ ưu tiên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có danh mục nào
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => {
                  try {
                    const dept = departments.find((d) => d.id === category.department_id)
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-sm">{category.code || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{category.name || "-"}</p>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{dept?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {category.sla_response_hours || 0}h / {category.sla_resolution_hours || 0}h
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {category.priority_default &&
                          ["low", "medium", "high", "critical"].includes(category.priority_default) ? (
                            <PriorityBadge priority={category.priority_default} />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {category.priority_default || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              category.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {category.is_active ? "Hoạt động" : "Tắt"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
    </div>
  )
}
