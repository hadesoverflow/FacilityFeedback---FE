import { Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { PriorityBadge } from "./priority-badge"
import { SLAIndicator } from "./sla-indicator"
import { MapPin, User } from "lucide-react"
import type { Ticket } from "@/types/database"

interface TicketCardProps {
  ticket: Ticket
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link to={`/tickets/${ticket.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{ticket.ticket_number}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
              <h3 className="font-medium leading-tight">{ticket.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {ticket.location && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{ticket.location}</span>
              </div>
            )}
            {ticket.assignee && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{ticket.assignee.full_name}</span>
              </div>
            )}
            <div className="ml-auto">
              <SLAIndicator
                dueDate={ticket.sla_resolution_due}
                isBreached={ticket.is_sla_resolution_breached}
                completedAt={ticket.resolved_at}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
