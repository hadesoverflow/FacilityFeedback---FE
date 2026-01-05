import { BrowserRouter } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import RootLayout from "@/app/layout"
import { AppRoutes } from "./routes"

export default function App() {
  return (
    <RootLayout>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
    </RootLayout>
  )
}

