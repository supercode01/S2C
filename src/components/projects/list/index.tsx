'use client'
import { useProjectCreation } from '@/hooks/use-project'
import { useAppSelector } from '@/redux/store'
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ProjectsList = () => {
    const {
        projects,
        canCreate,
        createProject,
        renameProject,
        deleteProject,
        isCreating,
        isRenaming,
        isDeleting,
    } = useProjectCreation()
    const user = useAppSelector((state) => state.profile)

    // Rename dialog state
    const [renameTarget, setRenameTarget] = React.useState<{ id: string; name: string } | null>(null)
    const [renameValue, setRenameValue] = React.useState('')
    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null)

    const openRename = (project: { _id: string; name: string }) => {
        setRenameTarget({ id: project._id, name: project.name })
        setRenameValue(project.name)
    }

    const handleRenameSubmit = async () => {
        if (!renameTarget) return
        const ok = await renameProject(renameTarget.id, renameValue)
        if (ok) setRenameTarget(null)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        const ok = await deleteProject(deleteTarget.id)
        if (ok) setDeleteTarget(null)
    }

    if (!canCreate) {
        return (
            <div className="text-center py-12">
                <p className='text-lg'>Please sign in to view your projects.</p>

            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">
                        Your Projects
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your design projects and continue where you left off.
                    </p>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-20">
                    {/* Pura empty-state ab clickable hai — click karne par naya
                        project create hota hai (New Project button jaisa hi) */}
                    <button
                        type="button"
                        onClick={() => createProject()}
                        disabled={isCreating}
                        className="group mx-auto flex flex-col items-center disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center transition-colors group-hover:bg-muted/70">
                            {isCreating ? (
                                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                            ) : (
                                <Plus className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {isCreating ? 'Creating...' : 'No projects yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Create your first project to get started
                        </p>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {projects.map((project: any) => (
                        <div key={project._id} className="group relative">
                            {/* Owner-only actions menu. getUserProjects sirf apne hi
                                projects return karta hai, aur backend ownership dobara
                                verify karta hai, is liye yeh sirf owner ko dikhta hai. */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label="Project options"
                                            onClick={(e) => e.preventDefault()}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                                        <DropdownMenuItem onSelect={() => openRename(project)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onSelect={() =>
                                                setDeleteTarget({ id: project._id, name: project.name })
                                            }
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <Link
                                href={`/dashboard/${user?.name}/canvas?project=${project._id}`}
                                className="block cursor-pointer"
                            >
                                <div className="space-y-3">
                                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                                        {project.thumbnail ? (
                                            <Image
                                                src={project.thumbnail}
                                                alt={project.name}
                                                width={300}
                                                height={200}
                                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                <Plus className="w-8 h-8 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    <div className='space-y-1'>
                                        <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(project.lastModified), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Rename dialog */}
            <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename project</DialogTitle>
                        <DialogDescription>
                            Choose a new name for your project.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Project name"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleRenameSubmit()
                            }
                        }}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRenameSubmit}
                            disabled={isRenaming || !renameValue.trim()}
                        >
                            {isRenaming ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{' '}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.name}
                            </span>
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
export default ProjectsList
