'use client'
import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Share2, Copy, Check, Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppSelector } from '@/redux/store'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const ShareProject = () => {
    const params = useSearchParams()
    const projectId = params.get('project')

    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'editor' | 'viewer'>('editor')
    const [isSending, setIsSending] = useState(false)
    const [copied, setCopied] = useState(false)

    const isValid =
        projectId && projectId !== 'null' && projectId !== 'undefined'

    const addCollaborator = useMutation(api.collaboration.addCollaborator)
    const removeCollaborator = useMutation(api.collaboration.removeCollaborator)
    const collaborators = useQuery(
        api.collaboration.listCollaborators,
        isValid ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const inviteLink =
        typeof window !== 'undefined' && isValid
            ? `${window.location.origin}/invite/${projectId}`
            : ''

    const handleInvite = async () => {
        const trimmedEmail = email.trim()
        if (!email.trim()) {
            toast.error('Please enter an email')
            return
        }
        if (!isValidEmail(trimmedEmail)) {
            toast.error('Invalid email address — please enter a valid email')
            return
        }
        try {
            setIsSending(true)

            // 1. DB mein collaborator add/invite karo
            await addCollaborator({
                projectId: projectId as Id<'projects'>,
                email: email.trim(),
                role,
            })

            // 2. Asli email bhejo (Gmail SMTP)
            await fetch('/api/invite/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    inviteLink,                       // upar already bana hua hai
                    role,
                    inviterName: me?.name ?? 'Someone',
                    projectName: project?.name ?? 'a project',
                }),
            })

            toast.success(`Invite sent to ${email}`)
            setEmail('')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to invite')
        } finally {
            setIsSending(false)
        }
    }

    const me = useAppSelector((state) => state.profile)
    const project = useQuery(
        api.projects.getProject,
        isValid ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        toast.success('Link copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRemove = async (collaboratorId: Id<'collaborators'>) => {
        try {
            await removeCollaborator({ collaboratorId })
            toast.success('Removed')
        } catch {
            toast.error('Failed to remove')
        }
    }

    if (!isValid) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    className="rounded-full h-10 px-4 flex items-center gap-2 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12]"
                >
                    <Share2 className="size-4" />
                    Share
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share project</DialogTitle>
                </DialogHeader>

                {/* Email invite */}
                <div className="flex items-center gap-2">
                    <Input
                        type="email"
                        placeholder="Enter email to invite"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    />
                    <Select
                        value={role}
                        onValueChange={(v) => setRole(v as 'editor' | 'viewer')}
                    >
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleInvite} disabled={isSending}>
                        {isSending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            'Invite'
                        )}
                    </Button>
                </div>

                {/* Collaborators list */}
                <div className="space-y-2 max-h-52 overflow-y-auto">
                    {collaborators?.map((c) => (
                        <div
                            key={c._id}
                            className="flex items-center justify-between text-sm py-1"
                        >
                            <div className="flex flex-col">
                                <span>{c.name ?? c.email}</span>
                                <span className="text-xs text-muted-foreground">
                                    {c.role} · {c.status}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    handleRemove(c._id as Id<'collaborators'>)
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                    {collaborators?.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No collaborators yet.
                        </p>
                    )}
                </div>

                {/* Copy link */}
                <div className="flex items-center gap-2 border-t pt-3">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button variant="outline" onClick={handleCopy}>
                        {copied ? (
                            <Check className="size-4" />
                        ) : (
                            <Copy className="size-4" />
                        )}
                        Copy Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
// Email format check — standard pattern
const isValidEmail = (email: string): boolean => {
    const trimmed = email.trim()
    // ek @ ho, @ se pehle/baad kuch ho, domain mein dot ho, koi space na ho
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
    if (!pattern.test(trimmed)) return false
    if (trimmed.includes('..')) return false          // double dots invalid
    if (trimmed.length > 254) return false             // max email length
    return true
}

export default ShareProject