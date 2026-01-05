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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  DoorOpen,
} from "lucide-react"
import type { Department, User, Ticket as TicketType, FeedbackCategory } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2, active: true },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

export default function DepartmentsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tickets, setTickets] = useState<Array<{ id: string; department_id: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; department_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager_id: "",
  })
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string>>({})

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
      fetch(`${API_BASE}/categories`)
        .then(async (r) => {
          if (!r.ok) return []
          return r.json().catch(() => [])
        })
        .catch(() => []),
    ])
      .then(([departmentsRes, usersRes, ticketsRes, categoriesRes]) => {
        try {
          const mappedDepartments = Array.isArray(departmentsRes)
            ? departmentsRes.map((d: any) => {
                // Ensure id is always a string for consistent comparison
                const deptId = d.id !== null && d.id !== undefined ? String(d.id).trim() : ""
                return {
                  id: deptId,
                  name: d.name || "",
                  code: d.code || "",
                  description: d.description || "",
                  manager_id: d.managerId ? String(d.managerId).trim() : undefined,
                  created_at: d.createdAt,
                  updated_at: d.updatedAt,
                }
              })
            : []
          const mappedUsers = Array.isArray(usersRes)
            ? usersRes.map((u: any) => {
                // Normalize role - backend returns enum as PascalCase: "Student", "Staff", "DepartmentAdmin"
                // Or may return RoleId as number: 1=student, 2=staff, 3=department_admin
                let normalizedRole = u.role
                if (typeof u.role === "string") {
                  // Backend returns PascalCase enum: "Student", "Staff", "DepartmentAdmin"
                  const roleLower = u.role.toLowerCase()
                  if (roleLower === "student") {
                    normalizedRole = "student"
                  } else if (roleLower === "staff") {
                    normalizedRole = "staff"
                  } else if (roleLower === "departmentadmin" || u.role === "DepartmentAdmin") {
                    normalizedRole = "department_admin"
                  } else {
                    // Fallback: try to normalize
                    normalizedRole = roleLower
                  }
                } else if (typeof u.role === "number") {
                  // If role is a number (RoleId), map it
                  normalizedRole = u.role === 1 ? "student" : u.role === 2 ? "staff" : u.role === 3 ? "department_admin" : "student"
                } else if (u.roleId !== undefined) {
                  // If role is from RoleId property, map it
                  normalizedRole = u.roleId === 1 ? "student" : u.roleId === 2 ? "staff" : u.roleId === 3 ? "department_admin" : "student"
                }
                
                // Handle departmentId - backend may return number or string, convert to string for consistency
                let departmentId: string | undefined = undefined
                if (u.departmentId !== null && u.departmentId !== undefined) {
                  // Convert to string and trim
                  const deptIdStr = String(u.departmentId).trim()
                  // Check if it's not "null", "undefined", or empty
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
          const mappedTickets: Array<{ id: string; department_id: string }> = Array.isArray(ticketsRes)
            ? ticketsRes
                .filter((t: any) => t != null && t.id != null && t.departmentId != null)
                .map((t: any): { id: string; department_id: string } => ({
                  id: String(t.id),
                  department_id: String(t.departmentId),
                }))
            : []
          const mappedCategories = Array.isArray(categoriesRes)
            ? categoriesRes.map((c: any) => ({
                id: String(c.id),
                department_id: String(c.departmentId),
              } as Partial<FeedbackCategory> & { id: string; department_id: string }))
            : []
          setDepartments(mappedDepartments)
          setUsers(mappedUsers)
          setTickets(mappedTickets)
          setCategories(mappedCategories)
          
          // Debug logging
          console.log("=== DEBUG: Data Mapping ===")
          console.log("Mapped departments:", mappedDepartments.map(d => ({ id: d.id, name: d.name, idType: typeof d.id })))
          console.log("Mapped users (ALL):", mappedUsers.map(u => ({ 
            id: u.id, 
            name: u.full_name, 
            role: u.role, 
            dept: u.department_id, 
            deptType: typeof u.department_id,
            hasDept: u.department_id !== undefined && u.department_id !== null && u.department_id !== ""
          })))
          console.log("Staff users (role=staff):", mappedUsers.filter((u) => {
            const roleStr = String(u.role || "").toLowerCase()
            return roleStr === "staff"
          }).map(u => ({ id: u.id, name: u.full_name, dept: u.department_id })))
          mappedDepartments.forEach((dept) => {
            const deptStaff = mappedUsers.filter((u) => {
              // Only include users with valid department_id
              if (!u.department_id || u.department_id === "" || u.department_id === "null" || u.department_id === "undefined") {
                return false
              }
              const userDeptId = String(u.department_id).trim()
              const targetDeptId = String(dept.id).trim()
              const matchesDept = userDeptId === targetDeptId
              const roleStr = String(u.role || "").toLowerCase()
              const isStaff = roleStr === "staff"
              return matchesDept && isStaff
            })
            console.log(`Department ${dept.name} (id: ${dept.id}, type: ${typeof dept.id}):`, deptStaff.length, "staff", deptStaff.map(s => ({ 
              name: s.full_name, 
              dept: s.department_id, 
              deptType: typeof s.department_id,
              role: s.role 
            })))
          })
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

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // staffUsers: includes both staff and department_admin (for dropdowns like "Trưởng phòng")
  const staffUsers = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    
    // Explicitly check for student first and exclude immediately
    if (roleStr === "student") {
      return false
    }
    
    // Only include staff and department_admin
    const isStaff = roleStr === "staff"
    const isAdmin = roleStr === "department_admin" || roleStr === "departmentadmin"
    
    const result = isStaff || isAdmin
    
    // Debug logging for any unexpected cases
    if (!result && roleStr !== "student") {
      console.warn(`[staffUsers] User ${u.full_name} (role: "${u.role}" -> "${roleStr}") is being excluded from staffUsers`)
    }
    
    return result
  })
  
  // actualStaffCount: ONLY staff (role = "staff"), excludes department_admin and students
  // This is used for "Tổng nhân viên" display
  const actualStaffCount = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "staff"
  }).length
  
  // managerUsers: ONLY staff (not admin) for "Trưởng phòng" dropdown
  const managerUsers = users.filter((u) => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    // Only include staff, exclude students and department_admin
    return roleStr === "staff"
  })
  
  // Debug: log all users and their roles
  console.log("[staffUsers] Total users:", users.length)
  console.log("[staffUsers] Filtered staff users (includes admin):", staffUsers.length, staffUsers.map(u => ({ 
    name: u.full_name, 
    email: u.email, 
    role: u.role,
    roleType: typeof u.role
  })))
  console.log("[actualStaffCount] Actual staff count (role=staff only):", actualStaffCount)
  const students = users.filter(u => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "student"
  })
  console.log("[staffUsers] Excluded users (students):", students.length, students.map(u => ({ 
    name: u.full_name, 
    email: u.email, 
    role: u.role 
  })))
  
  // Double-check: ensure no students in staffUsers
  const studentsInStaff = staffUsers.filter(u => {
    const roleStr = String(u.role || "").toLowerCase().trim()
    return roleStr === "student"
  })
  if (studentsInStaff.length > 0) {
    console.error("[staffUsers] ERROR: Found students in staffUsers!", studentsInStaff.map(u => ({ 
      name: u.full_name, 
      email: u.email, 
      role: u.role 
    })))
  }

  const handleCreate = async () => {
    try {
      // Validate manager_id - only allow staff (not admin), not students
      let managerId = formData.manager_id || null
      if (managerId) {
        const managerUser = managerUsers.find((u) => u.id === managerId)
        if (!managerUser) {
          console.warn(`[handleCreate] Invalid manager_id: ${managerId} - user is not staff`)
          managerId = null // Reset to null if manager is not a valid staff
        }
      }
      
      const response = await fetch(`${API_BASE}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          managerId: managerId,
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
        setIsCreateOpen(false)
        resetForm()
      }
    } catch (err) {
      console.error("Error creating department:", err)
    }
  }

  const handleEdit = async () => {
    if (!selectedDepartment) return
    try {
      // Validate manager_id - only allow staff (not admin), not students
      let managerId = formData.manager_id || null
      if (managerId) {
        const managerUser = managerUsers.find((u) => u.id === managerId)
        if (!managerUser) {
          console.warn(`[handleEdit] Invalid manager_id: ${managerId} - user is not staff`)
          managerId = null // Reset to null if manager is not a valid staff
        }
      }
      
      // Update department info
      const deptResponse = await fetch(`${API_BASE}/departments/${selectedDepartment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          managerId: managerId,
        }),
      })
      
      if (deptResponse.ok) {
        const updated = await deptResponse.json()
        
        // Update staff assignments
        const updatePromises = Object.entries(staffAssignments).map(async ([staffId, deptId]) => {
          try {
            const userResponse = await fetch(`${API_BASE}/users/${staffId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                departmentId: deptId || null,
              }),
            })
            if (!userResponse.ok) {
              console.error(`Failed to update user ${staffId}`)
            }
          } catch (err) {
            console.error(`Error updating user ${staffId}:`, err)
          }
        })
        
        await Promise.all(updatePromises)
        
        // Refresh data
        const [departmentsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/departments`).then((r) => r.json().catch(() => [])),
          fetch(`${API_BASE}/users`).then((r) => r.json().catch(() => [])),
        ])
        
        const mappedDepartments = Array.isArray(departmentsRes)
          ? departmentsRes.map((d: any) => {
              // Ensure id is always a string for consistent comparison
              const deptId = d.id !== null && d.id !== undefined ? String(d.id).trim() : ""
              return {
                id: deptId,
                name: d.name || "",
                code: d.code || "",
                description: d.description || "",
                manager_id: d.managerId ? String(d.managerId).trim() : undefined,
                created_at: d.createdAt,
                updated_at: d.updatedAt,
              }
            })
          : []
        const mappedUsers = Array.isArray(usersRes)
          ? usersRes.map((u: any) => {
              // Normalize role - backend returns camelCase: "student", "staff", "departmentAdmin"
              let normalizedRole = u.role
              if (typeof u.role === "string") {
                // Convert camelCase to snake_case for consistency
                if (u.role === "departmentAdmin" || u.role === "DepartmentAdmin") {
                  normalizedRole = "department_admin"
                } else {
                  normalizedRole = u.role.toLowerCase()
                }
              } else if (u.roleId !== undefined) {
                // If role is from RoleId, map it
                normalizedRole = u.roleId === 1 ? "student" : u.roleId === 2 ? "staff" : u.roleId === 3 ? "department_admin" : "student"
              }
              
              // Handle departmentId - backend may return number or string, convert to string for consistency
              let departmentId: string | undefined = undefined
              if (u.departmentId !== null && u.departmentId !== undefined) {
                // Convert to string and trim
                const deptIdStr = String(u.departmentId).trim()
                // Check if it's not "null", "undefined", or empty
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
        
        setDepartments(mappedDepartments)
        setUsers(mappedUsers)
        
        setIsEditOpen(false)
        setSelectedDepartment(null)
        resetForm()
        setStaffAssignments({})
      }
    } catch (err) {
      console.error("Error updating department:", err)
    }
  }

  const handleDelete = async () => {
    if (!selectedDepartment) return
    try {
      const response = await fetch(`${API_BASE}/departments/${selectedDepartment.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setDepartments(departments.filter((dept) => dept.id !== selectedDepartment.id))
        setIsDeleteOpen(false)
        setSelectedDepartment(null)
      }
    } catch (err) {
      console.error("Error deleting department:", err)
    }
  }

  const openEdit = (department: Department) => {
    setSelectedDepartment(department)
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || "",
      manager_id: department.manager_id || "",
    })
    // Initialize staff assignments with ALL staff and their current departments
    const assignments: Record<string, string> = {}
    staffUsers.forEach((staff) => {
      if (staff.department_id) {
        assignments[staff.id] = staff.department_id
      }
    })
    setStaffAssignments(assignments)
    setIsEditOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: "", code: "", description: "", manager_id: "" })
    setStaffAssignments({})
  }
  
  const handleStaffAssignmentChange = (staffId: string, newDeptId: string) => {
    setStaffAssignments((prev) => ({
      ...prev,
      [staffId]: newDeptId,
    }))
  }
  
  const addStaffToDepartment = (staffId: string) => {
    if (selectedDepartment) {
      setStaffAssignments((prev) => ({
        ...prev,
        [staffId]: selectedDepartment.id,
      }))
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getStaffCount = (deptId: string) => {
    // Normalize deptId to string for comparison
    const normalizedDeptId = String(deptId).trim()
    
    const count = users.filter((u) => {
      // First, filter out students immediately
      const roleStr = String(u.role || "").toLowerCase().trim()
      if (roleStr === "student") {
        return false
      }
      
      // Only include staff (not department_admin for count)
      const isStaff = roleStr === "staff"
      if (!isStaff) {
        return false
      }
      
      // Only include users with a valid department_id (not null/undefined/empty)
      if (!u.department_id || u.department_id === "" || u.department_id === "null" || u.department_id === "undefined") {
        return false
      }
      
      // Compare department IDs - normalize both to strings and compare
      const userDeptId = String(u.department_id).trim()
      const matchesDept = userDeptId === normalizedDeptId
      
      if (matchesDept) {
        console.log(`[getStaffCount] MATCH: User ${u.full_name} (dept: ${userDeptId}) matches dept ${normalizedDeptId}`)
      }
      
      return matchesDept
    }).length
    
    // Debug: show only staff users (exclude students) with department_id and their comparison result
    console.log(`[getStaffCount] Dept ${normalizedDeptId} (type: ${typeof normalizedDeptId}):`, count, "staff")
    users.filter(u => {
      const roleStr = String(u.role || "").toLowerCase().trim()
      // Only show staff, exclude students and admins
      return roleStr === "staff"
    }).forEach(u => {
      const userDeptId = u.department_id ? String(u.department_id).trim() : "NULL"
      const matches = userDeptId === normalizedDeptId
      console.log(`  - ${u.full_name}: dept=${userDeptId} (type: ${typeof u.department_id}), matches=${matches}`)
    })
    
    return count
  }
  
  const getStaffList = (deptId: string) => {
    // Normalize deptId to string for comparison
    const normalizedDeptId = String(deptId).trim()
    
    const list = users.filter((u) => {
      // First, filter out students immediately
      const roleStr = String(u.role || "").toLowerCase().trim()
      if (roleStr === "student") {
        return false
      }
      
      // Only include staff (not department_admin for list)
      const isStaff = roleStr === "staff"
      if (!isStaff) {
        return false
      }
      
      // Only include users with a valid department_id (not null/undefined/empty)
      if (!u.department_id || u.department_id === "" || u.department_id === "null" || u.department_id === "undefined") {
        return false
      }
      
      // Compare department IDs - normalize both to strings and compare
      const userDeptId = String(u.department_id).trim()
      const matchesDept = userDeptId === normalizedDeptId
      
      return matchesDept
    })
    
    console.log(`[getStaffList] Dept ${normalizedDeptId}:`, list.length, "staff:", list.map(s => ({ 
      id: s.id, 
      name: s.full_name, 
      role: s.role, 
      dept: s.department_id,
      deptType: typeof s.department_id
    })))
    
    return list
  }
  const getTicketCount = (deptId: string) => tickets.filter((t) => t.department_id === deptId).length
  const getCategoryCount = (deptId: string) => categories.filter((c) => c.department_id === deptId).length

  const toggleDepartment = (deptId: string) => {
    const newExpanded = new Set(expandedDepartments)
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId)
    } else {
      newExpanded.add(deptId)
    }
    setExpandedDepartments(newExpanded)
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
              <h1 className="text-xl font-semibold">Quản lý Phòng ban</h1>
              <p className="text-sm text-muted-foreground">CRUD phòng/bộ phận xử lý ticket</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm phòng ban..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm phòng ban
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm phòng ban mới</DialogTitle>
                    <DialogDescription>Tạo phòng ban mới để phân công xử lý ticket</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tên phòng ban</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="VD: Phòng CNTT"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mã phòng ban</Label>
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
                        placeholder="Mô tả nhiệm vụ phòng ban..."
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
                          {managerUsers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Hủy
                    </Button>
                    <Button 
                      onClick={handleCreate} 
                      className="bg-violet-600 hover:bg-violet-700"
                      disabled={!formData.name.trim() || !formData.code.trim()}
                    >
                      Tạo phòng ban
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Building2 className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{departments.length}</p>
                    <p className="text-sm text-muted-foreground">Tổng phòng ban</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{actualStaffCount}</p>
                    <p className="text-sm text-muted-foreground">Tổng nhân viên</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Ticket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tickets.length}</p>
                    <p className="text-sm text-muted-foreground">Tổng ticket</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danh sách phòng ban ({filteredDepartments.length})</CardTitle>
              <CardDescription>Quản lý các phòng ban và bộ phận trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Trưởng phòng</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : filteredDepartments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Chưa có phòng ban nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDepartments.map((dept) => {
                      // Only find manager from managerUsers (staff only, exclude admin and students)
                      const manager = managerUsers.find((u) => u.id === dept.manager_id)
                      const staffCount = getStaffCount(dept.id)
                      const staffList = getStaffList(dept.id)
                      const ticketCount = getTicketCount(dept.id)
                      const categoryCount = getCategoryCount(dept.id)
                      const isExpanded = expandedDepartments.has(dept.id)

                      return (
                        <>
                          <TableRow key={dept.id}>
                            <TableCell>
                              <Collapsible open={isExpanded} onOpenChange={() => toggleDepartment(dept.id)}>
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
                              <div>
                                <p className="font-medium">{dept.name}</p>
                                <p className="text-xs text-muted-foreground">{dept.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{dept.code}</Badge>
                            </TableCell>
                            <TableCell>
                              {manager ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">{manager.full_name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{manager.full_name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="w-fit">{staffCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{categoryCount}</Badge>
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
                                  <DropdownMenuItem onClick={() => openEdit(dept)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedDepartment(dept)
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
                              <TableCell colSpan={8} className="bg-slate-50 p-0">
                                <div className="py-4 px-6">
                                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Danh sách nhân viên ({staffCount})
                                  </h4>
                                  {staffList.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Chưa có nhân viên nào trong phòng ban này</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {staffList.map((staff) => (
                                        <div
                                          key={staff.id}
                                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-violet-300 transition-colors"
                                        >
                                          <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">
                                              {staff.full_name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{staff.full_name}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Mail className="w-3 h-3" />
                                              <span className="truncate">{staff.email}</span>
                                            </div>
                                            <Badge
                                              variant="outline"
                                              className="mt-1 text-xs"
                                            >
                                              {staff.role === "department_admin" ? "Trưởng phòng" : "Nhân viên"}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phòng ban</DialogTitle>
            <DialogDescription>Cập nhật thông tin phòng ban</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên phòng ban</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mã phòng ban</Label>
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
              <Label>Trưởng phòng</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trưởng phòng" />
                </SelectTrigger>
                <SelectContent>
                  {managerUsers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Staff Management Section */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Quản lý nhân viên</Label>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(() => {
                  // Triple-filter to ensure no students appear and only show staff (not admin without department)
                  const validStaff = staffUsers.filter((staff) => {
                    const roleStr = String(staff.role || "").toLowerCase().trim()
                    
                    // First: Explicitly exclude students
                    if (roleStr === "student") {
                      console.warn(`[Dialog] Filtering out student: ${staff.full_name} (role: "${staff.role}" -> "${roleStr}")`)
                      return false
                    }
                    
                    // Second: Only include staff (exclude department_admin for this list)
                    const isStaff = roleStr === "staff"
                    if (!isStaff) {
                      // Log if admin is being excluded
                      if (roleStr === "department_admin" || roleStr === "departmentadmin") {
                        console.log(`[Dialog] Excluding admin from staff list: ${staff.full_name} (role: "${staff.role}")`)
                      }
                      return false
                    }
                    
                    // Third: Optionally, you can also filter by department_id if needed
                    // For now, we show all staff regardless of department assignment
                    
                    return true
                  })
                  
                  if (validStaff.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Chưa có nhân viên nào trong hệ thống.
                      </p>
                    )
                  }
                  
                  return validStaff.map((staff) => {
                    const currentDeptId = staffAssignments[staff.id] || staff.department_id || ""
                    const currentDept = departments.find((d) => d.id === currentDeptId)
                    
                    return (
                      <div
                        key={staff.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                            {staff.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{staff.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                        </div>
                        <Select
                          value={currentDeptId || "none"}
                          onValueChange={(newDeptId) => handleStaffAssignmentChange(staff.id, newDeptId === "none" ? "" : newDeptId)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Chọn phòng ban" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Không có phòng ban</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })
                })()}
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
              Bạn có chắc chắn muốn xóa phòng ban "{selectedDepartment?.name}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa phòng ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
