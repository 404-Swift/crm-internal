import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/molecules/SearchBar'
import { FilterDropdown } from '@/components/molecules/FilterDropdown'
import { ContactCard } from '@/components/molecules/ContactCard'
import { useContacts } from '@/hooks/useContacts'
import { CONTACT_STATUSES, CONTACT_SOURCES } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/atoms/Badge'
import { Avatar } from '@/components/atoms/Avatar'
import { Link } from 'react-router-dom'

type ViewMode = 'grid' | 'list'

interface ContactsListProps {
  viewMode?: ViewMode
}

export function ContactsList({ viewMode = 'grid' }: ContactsListProps) {
  const { contacts, isLoading } = useContacts()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')

  const filteredContacts = useMemo(() => {
    let filtered = contacts

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (contact) =>
          contact.first_name.toLowerCase().includes(query) ||
          contact.last_name.toLowerCase().includes(query) ||
          contact.email.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query)
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((contact) => contact.status === statusFilter)
    }

    if (sourceFilter) {
      filtered = filtered.filter((contact) => contact.source === sourceFilter)
    }

    return filtered
  }, [contacts, searchQuery, statusFilter, sourceFilter])

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      // Sort by updated_at descending (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [filteredContacts])

  if (isLoading) {
    return <div className="text-muted-foreground">Loading contacts...</div>
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...CONTACT_STATUSES.map((status) => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
    })),
  ]

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    ...CONTACT_SOURCES.map((source) => ({
      value: source,
      label: source.charAt(0).toUpperCase() + source.slice(1),
    })),
  ]

  if (sortedContacts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search contacts..."
            />
          </div>
          <FilterDropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
          />
          <FilterDropdown
            options={sourceOptions}
            value={sourceFilter}
            onChange={setSourceFilter}
            placeholder="Filter by source"
          />
        </div>
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || statusFilter || sourceFilter
            ? 'No contacts match your filters'
            : 'No contacts yet'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search contacts..."
          />
        </div>
        <FilterDropdown
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filter by status"
        />
        <FilterDropdown
          options={sourceOptions}
          value={sourceFilter}
          onChange={setSourceFilter}
          placeholder="Filter by source"
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedContacts.map((contact) => {
            const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
            const fullName = `${contact.first_name} ${contact.last_name}`

            return (
              <Link key={contact.id} to={`/contacts/${contact.id}`}>
                <Card className="hover:shadow-apple-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          fallback={initials}
                          alt={fullName}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="truncate">{contact.email}</span>
                            {contact.company && (
                              <span className="truncate">{contact.company}</span>
                            )}
                            {contact.phone && (
                              <span className="truncate">{contact.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contact.status && (
                          <Badge variant="secondary" className="text-xs">
                            {contact.status}
                          </Badge>
                        )}
                        {contact.source && (
                          <Badge variant="outline" className="text-xs">
                            {contact.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
