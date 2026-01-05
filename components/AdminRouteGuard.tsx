"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface AdminRouteGuardProps {
  children: React.ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not logged in, redirect to login
        navigate("/login", { replace: true })
      } else {
        // Normalize role - backend may return "DepartmentAdmin" (PascalCase) or "department_admin" (snake_case)
        const roleStr = String(user.role || "").toLowerCase().trim()
        const normalizedRole = roleStr === "departmentadmin" || roleStr === "department_admin" 
          ? "department_admin" 
          : roleStr
        
        if (normalizedRole !== "department_admin") {
          // Not admin, redirect to appropriate page based on role
          switch (normalizedRole) {
            case "staff":
              navigate("/staff", { replace: true })
              break
            case "student":
            default:
              navigate("/student", { replace: true })
              break
          }
        }
      }
    }
  }, [user, isLoading, navigate])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  // Not logged in or not admin - will redirect in useEffect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    )
  }
  
  // Normalize role for comparison
  const roleStr = String(user.role || "").toLowerCase().trim()
  const normalizedRole = roleStr === "departmentadmin" || roleStr === "department_admin" 
    ? "department_admin" 
    : roleStr
  
  if (normalizedRole !== "department_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    )
  }

  // User is admin, render children
  return <>{children}</>
}

