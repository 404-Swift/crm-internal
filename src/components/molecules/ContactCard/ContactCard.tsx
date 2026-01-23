import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types/contact'

interface ContactCardProps {
  contact: Contact
  className?: string
}

export function ContactCard({ contact, className }: ContactCardProps) {
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
  const fullName = `${contact.first_name} ${contact.last_name}`

  return (
    <Link to={`/contacts/${contact.id}`}>
      <Card className={cn("hover:shadow-apple-lg transition-shadow cursor-pointer h-full", className)}>
        <CardContent className="p-4 h-full flex items-center">
          <div className="flex items-center gap-3 w-full">
            <Avatar
              fallback={initials}
              alt={fullName}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{fullName}</h3>
              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
              {contact.company && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {contact.company}
                </p>
              )}
            </div>
            {contact.status && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {contact.status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
