"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GraduationCap, Wrench, Shield, Loader2, Wifi, Monitor, Zap } from "lucide-react"

const accountTypes = [
  {
    id: "student",
    label: "Sinh viên",
    icon: GraduationCap,
    email: "student@edu.vn",
    password: "123@",
    description: "Gửi phản ánh về cơ sở vật chất",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "staff",
    label: "Nhân viên",
    icon: Wrench,
    email: "staff@edu.vn",
    password: "123@",
    description: "Xử lý các ticket được giao",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "admin",
    label: "Quản trị viên",
    icon: Shield,
    email: "admin@edu.vn",
    password: "123@",
    description: "Quản lý toàn bộ hệ thống",
    color: "from-blue-500 to-blue-600",
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedTab, setSelectedTab] = useState("student")
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const result = await login(email, password)
    if (result.success) {
      // Get user from localStorage to check role
      const storedUser = localStorage.getItem("helpdesk_user")
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          // Redirect based on role from API response
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
        } catch (err) {
          console.error("Error parsing user:", err)
          navigate("/student", { replace: true })
        }
      } else {
        // Fallback if user not in localStorage
        navigate("/student", { replace: true })
      }
    } else {
      setError(result.error || "Email hoặc mật khẩu không đúng")
    }
    setIsLoading(false)
  }

  const handleQuickLogin = (accountEmail: string, accountPassword: string) => {
    setEmail(accountEmail)
    setPassword(accountPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 text-white p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Monitor className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold">Helpdesk</h1>
            </div>
            <p className="text-xl text-slate-300">Hệ thống phản ánh cơ sở vật chất</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Wifi className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Báo cáo sự cố nhanh chóng</h3>
                <p className="text-sm text-slate-400">WiFi, thiết bị, cơ sở vật chất</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Theo dõi tiến độ xử lý</h3>
                <p className="text-sm text-slate-400">SLA tracking realtime</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold">Quản lý chuyên nghiệp</h3>
                <p className="text-sm text-slate-400">Phân quyền theo vai trò</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="p-2 bg-primary rounded-xl">
                <Monitor className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">Helpdesk</span>
            </div>
            <CardTitle className="text-2xl">Đăng nhập</CardTitle>
            <CardDescription>Chọn loại tài khoản và đăng nhập vào hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                {accountTypes.map((account) => (
                  <TabsTrigger
                    key={account.id}
                    value={account.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    onClick={() => handleQuickLogin(account.email, account.password)}
                  >
                    <account.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{account.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {accountTypes.map((account) => (
                <TabsContent key={account.id} value={account.id} className="space-y-6">
                  <div
                    className={`p-4 rounded-xl bg-gradient-to-r ${account.color} text-white flex items-center gap-4`}
                  >
                    <div className="p-3 bg-white/20 rounded-xl">
                      <account.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{account.label}</h3>
                      <p className="text-white/80 text-sm">{account.description}</p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Mật khẩu</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang đăng nhập...
                        </>
                      ) : (
                        "Đăng nhập"
                      )}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-muted-foreground border-t pt-4">
                    <p className="font-medium mb-1">Tài khoản demo:</p>
                    <p>
                      Email: <code className="bg-muted px-1 rounded">{account.email}</code>
                    </p>
                    <p>
                      Mật khẩu: <code className="bg-muted px-1 rounded">{account.password}</code>
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
