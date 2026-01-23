import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { UserPlus, Edit, Trash2 } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useAuth } from '@/hooks/useAuth'
import { TeamMemberForm } from '@/components/molecules/TeamMemberForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'

export default function TeamMembers() {
  const { user } = useAuth()
  const { teamMembers, isLoading, deleteTeamMember, isDeleting } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this team member?')) return

    try {
      await deleteTeamMember({ id, userId: user.id })
      toast.success('Team member deleted', 'The team member has been removed')
    } catch (error) {
      toast.error('Delete failed', (error as Error).message)
    }
  }

  const editingMemberData = editingMember
    ? teamMembers.find(m => m.id === editingMember)
    : null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground mt-2">
              Manage your team members and assign them to bookings
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Icon icon={UserPlus} className="mr-2" size={18} />
            Add Team Member
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading team members...</div>
        ) : teamMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No team members yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Icon icon={UserPlus} className="mr-2" size={18} />
                Add Your First Team Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map(member => (
              <Card key={member.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingMember(member.id)
                          setShowForm(true)
                        }}
                      >
                        <Icon icon={Edit} size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        disabled={isDeleting}
                      >
                        <Icon icon={Trash2} size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {member.role && (
                      <Badge variant="secondary">{member.role}</Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </DialogTitle>
              <DialogDescription>
                {editingMember
                  ? 'Update team member information'
                  : 'Add a new team member to assign to bookings'}
              </DialogDescription>
            </DialogHeader>
            <TeamMemberForm
              initialData={editingMemberData || undefined}
              onSuccess={() => {
                setShowForm(false)
                setEditingMember(null)
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingMember(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
