"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "@/types/database"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem("helpdesk_user")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        console.log("Loaded user from localStorage:", parsedUser)
        console.log("User ID from localStorage:", parsedUser.id, "Type:", typeof parsedUser.id)
        setUser(parsedUser)
      } catch (error) {
        console.error("Failed to parse stored user:", error)
        localStorage.removeItem("helpdesk_user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = `${API_BASE}/Auth/login`
      console.log("Attempting login to:", url)
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("Response status:", res.status, res.statusText)

      if (!res.ok) {
        let errorMessage = "Email hoặc mật khẩu không đúng"
        try {
          const errorData = await res.json()
          console.log("Error response:", errorData)
          if (errorData.message) {
            errorMessage = errorData.message === "Invalid email or password" 
              ? "Email hoặc mật khẩu không đúng"
              : errorData.message === "Account is inactive"
              ? "Tài khoản đã bị vô hiệu hóa"
              : errorData.message
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          // If error response is not JSON, use default message
          if (res.status === 0 || res.status >= 500) {
            errorMessage = "Lỗi server. Vui lòng kiểm tra backend có đang chạy không."
          }
        }
        return { success: false, error: errorMessage }
      }

      const apiUser = await res.json()
      console.log("Login successful, user data from API:", apiUser)
      console.log("API User ID:", apiUser.id, "Type:", typeof apiUser.id)

      const mappedUser: User = {
        id: String(apiUser.id),
        email: apiUser.email,
        full_name: apiUser.full_name ?? apiUser.fullName,
        role: apiUser.role,
        department_id: apiUser.department_id ?? apiUser.departmentId,
        created_at: apiUser.created_at ?? apiUser.createdAt,
        updated_at: apiUser.updated_at ?? apiUser.updatedAt,
      }

      console.log("Mapped user before saving:", mappedUser)
      console.log("Mapped user ID:", mappedUser.id, "Type:", typeof mappedUser.id)

      setUser(mappedUser)
      localStorage.setItem("helpdesk_user", JSON.stringify(mappedUser))
      console.log("User saved to localStorage")
      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      const errorMessage = error instanceof TypeError && error.message.includes("fetch")
        ? `Không thể kết nối đến server tại ${API_BASE}. Vui lòng kiểm tra:\n1. Backend có đang chạy không?\n2. Đúng port không? (https://localhost:7010)\n3. Mở https://localhost:7010/swagger để kiểm tra`
        : error instanceof Error
        ? `Lỗi: ${error.message}`
        : "Không thể kết nối đến server. Vui lòng thử lại sau."
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("helpdesk_user")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

