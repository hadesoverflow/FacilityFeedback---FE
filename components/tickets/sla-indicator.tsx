import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface SLAIndicatorProps {
  dueDate: string
  isBreached: boolean
  completedAt?: string
  className?: string
}

export function SLAIndicator({ dueDate, isBreached, completedAt, className }: SLAIndicatorProps) {
  const now = new Date()
  const due = new Date(dueDate)
  const completed = completedAt ? new Date(completedAt) : null

  if (completed) {
    const wasOnTime = completed <= due
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        {wasOnTime ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Đúng hạn</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Trễ hạn</span>
          </>
        )}
      </div>
    )
  }

  if (isBreached) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-red-600 dark:text-red-400">Đã vượt SLA</span>
      </div>
    )
  }

  const hoursRemaining = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((due.getTime() - now.getTime()) / (1000 * 60)) % 60

  if (hoursRemaining < 0) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-red-600 dark:text-red-400">Đã vượt SLA</span>
      </div>
    )
  }

  if (hoursRemaining < 2) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-amber-600 dark:text-amber-400">
          Còn {hoursRemaining > 0 ? `${hoursRemaining}h ${minutesRemaining}m` : `${minutesRemaining}m`}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Còn {hoursRemaining}h</span>
    </div>
  )
}
