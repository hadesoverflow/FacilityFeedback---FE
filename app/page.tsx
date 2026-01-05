"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/login", { replace: true })
      } else {
        // Redirect based on user role
        switch (user.role) {
          case "department_admin":
            navigate("/admin", { replace: true })
            break
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
  }, [user, isLoading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  )
}
