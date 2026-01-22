import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Avatar } from '@/components/atoms/Avatar'
import { ActivityTimeline } from '@/components/organisms/ActivityTimeline'
import { ContactForm } from '@/components/molecules/ContactForm'
import { useContact } from '@/hooks/useContacts'
import { ArrowLeft, Mail, Phone, Building, Edit } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { contact, isLoading } = useContact(id!)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-muted-foreground">Loading contact...</div>
      </DashboardLayout>
    )
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contact not found</p>
          <Button onClick={() => navigate('/contacts')} className="mt-4">
            Back to Contacts
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
  const fullName = `${contact.first_name} ${contact.last_name}`

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/contacts')}
          >
            <Icon icon={ArrowLeft} className="mr-2" size={18} />
            Back
          </Button>
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            variant="outline"
          >
            <Icon icon={Edit} className="mr-2" size={18} />
            Edit Contact
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar fallback={initials} className="h-16 w-16" />
                  <div>
                    <CardTitle className="text-2xl">{fullName}</CardTitle>
                    {contact.status && (
                      <Badge variant="secondary" className="mt-2">
                        {contact.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon icon={Mail} className="text-muted-foreground" size={18} />
                  <span className="text-sm">{contact.email}</span>
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <Icon icon={Phone} className="text-muted-foreground" size={18} />
                    <span className="text-sm">{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-3">
                    <Icon icon={Building} className="text-muted-foreground" size={18} />
                    <span className="text-sm">{contact.company}</span>
                  </div>
                )}
                {contact.source && (
                  <div>
                    <span className="text-sm text-muted-foreground">Source: </span>
                    <span className="text-sm">{contact.source}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline contactId={contact.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={contact || null}
            onSuccess={() => {
              setIsEditDialogOpen(false)
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
