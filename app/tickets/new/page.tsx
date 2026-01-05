"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FeedbackCategory, Department } from "@/types/database"
import { ArrowLeft, Send, Upload } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function NewTicketPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<FeedbackCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    location: "",
    priority: "medium",
  })

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

  const mapCategory = (api: any): FeedbackCategory => ({
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
  })

  const mapDepartment = (api: any): Department => ({
    id: String(api.id),
    name: api.name,
    code: api.code,
    description: api.description,
    manager_id: api.managerId ? String(api.managerId) : undefined,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  })

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/categories`).then((r) => r.json()),
      fetch(`${API_BASE}/departments`).then((r) => r.json()),
    ])
      .then(([cats, depts]) => {
        setCategories((cats || []).map(mapCategory))
        setDepartments((depts || []).map(mapDepartment))
      })
      .catch(() => setError("Không tải được danh mục/phòng ban"))
  }, [])

  const selectedCategory = categories.find((c) => String(c.id) === formData.category_id)
  const assignedDepartment = selectedCategory
    ? departments.find((d) => String(d.id) === selectedCategory.department_id)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError("Bạn cần đăng nhập")
      return
    }
    setIsSubmitting(true)
    setError(null)

    const requestBody = {
      title: formData.title,
      description: formData.description,
      categoryId: formData.category_id,
      departmentId: assignedDepartment?.id ?? selectedCategory?.department_id,
      reporterId: user.id,
      priority: formData.priority,
      location: formData.location,
    }

    console.log("=== SUBMIT TICKET ===")
    console.log("API URL:", `${API_BASE}/tickets`)
    console.log("Request body:", requestBody)
    console.log("User:", user)
    console.log("ReporterId being sent:", requestBody.reporterId)
    console.log("User ID type:", typeof user.id, "Value:", user.id)

    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("Response status:", res.status, res.statusText)
      console.log("Response headers:", Object.fromEntries(res.headers.entries()))

      if (!res.ok) {
        let errorMessage = "Gửi ticket thất bại, vui lòng thử lại"
        try {
          const errorData = await res.json()
          console.log("Error response data:", errorData)
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.title) {
            errorMessage = errorData.title
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          const text = await res.text()
          console.log("Error response text:", text)
          errorMessage = `Lỗi ${res.status}: ${res.statusText}`
        }
        setError(errorMessage)
        return
      }

      const ticketData = await res.json()
      console.log("Ticket created successfully:", ticketData)
      
      alert("Phản ánh đã được gửi thành công!")
      navigate("/student/tickets")
    } catch (error) {
      console.error("Error creating ticket:", error)
      const errorMessage = error instanceof TypeError && error.message.includes("fetch")
        ? `Không thể kết nối đến server tại ${API_BASE}. Vui lòng kiểm tra backend có đang chạy không.`
        : error instanceof Error
        ? error.message
        : "Gửi ticket thất bại, vui lòng thử lại"
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gửi Ticket mới</h1>
          <p className="text-muted-foreground">Phản ánh sự cố về cơ sở vật chất, thiết bị</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Thông tin phản ánh</CardTitle>
            <CardDescription>Vui lòng cung cấp đầy đủ thông tin để chúng tôi xử lý nhanh chóng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục sự cố *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.is_active)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <p className="text-xs text-muted-foreground">
                  Phòng phụ trách: {assignedDepartment?.name} | SLA: Phản hồi trong{" "}
                  {selectedCategory.sla_response_hours}h, Xử lý trong {selectedCategory.sla_resolution_hours}h
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                placeholder="Mô tả ngắn gọn sự cố"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả chi tiết *</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết sự cố, bao gồm thời gian xảy ra, tình trạng hiện tại..."
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Vị trí *</Label>
              <Input
                id="location"
                placeholder="VD: Phòng A101, Tòa nhà A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Mức độ ưu tiên</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp - Không ảnh hưởng nhiều</SelectItem>
                  <SelectItem value="medium">Trung bình - Cần xử lý sớm</SelectItem>
                  <SelectItem value="high">Cao - Ảnh hưởng đến công việc/học tập</SelectItem>
                  <SelectItem value="critical">Khẩn cấp - Cần xử lý ngay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Đính kèm hình ảnh (tùy chọn)</Label>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Kéo thả hoặc click để tải ảnh lên</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG tối đa 5MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link to="/tickets">Hủy</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              "Đang gửi..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Gửi Ticket
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
