import { useState, useMemo } from 'react'
import { SearchBar } from '@/components/molecules/SearchBar'
import { FilterDropdown } from '@/components/molecules/FilterDropdown'
import { ContactCard } from '@/components/molecules/ContactCard'
import { useContacts } from '@/hooks/useContacts'
import { CONTACT_STATUSES, CONTACT_SOURCES } from '@/lib/constants'

export function ContactsList() {
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

      {filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || statusFilter || sourceFilter
            ? 'No contacts match your filters'
            : 'No contacts yet'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  )
}
