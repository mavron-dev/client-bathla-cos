'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { usersApi, ApiClientError } from '../lib/api-client'
import type { PublicUser } from '../types'

interface DeactivateUserDialogProps {
  user: PublicUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const confirm = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await usersApi.deactivate(user.id)
      toast.success(`Deactivated ${user.displayName}`)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const msg =
        error instanceof ApiClientError ? error.message : 'Failed to deactivate'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Deactivate {user?.displayName ?? 'user'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            They will no longer be able to sign in. Their existing tasks and
            audit entries are preserved. You can reverse this by editing the
            user back to Active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={isSubmitting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSubmitting ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
