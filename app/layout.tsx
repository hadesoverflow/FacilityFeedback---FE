import type React from "react"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="font-sans antialiased">
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </div>
  )
}
