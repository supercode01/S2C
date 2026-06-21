'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { CircleQuestionMark, Hash, LayoutTemplate, LogOut, User } from 'lucide-react'
import { Button } from '../ui/button'
import { Avatar, AvatarImage } from '../ui/avatar'
import { AvatarFallback } from '@radix-ui/react-avatar'
import { avatarColor } from '@/lib/utils'
import { useAppSelector } from '@/redux/store'
import { useAuth } from '@/hooks/use-auth'
import CreateProject from '../buttons/projects'
import Autosave from '../canvas/autosave'
import ShareProject from '../canvas/share'
import PresenceAvatars from '../canvas/presence/avatars'

type TabProps = {
    label: string
    href: string
    icon?: React.ReactNode
}

const Navbar = () => {
    const params = useSearchParams()
    const projectId = params.get('project')
    const pathname = usePathname()
    const me = useAppSelector((state) => state.profile)
    const { handleSignOut } = useAuth()

    const tabs: TabProps[] = [
        {
            label: "Canvas",
            href: `/dashboard/${me.name}/canvas?project=${projectId}`,
            icon: <Hash className="h-4 w-4" />
        },
        {
            label: "Style Guide",
            href: `/dashboard/${me.name}/style-guide?project=${projectId}`,
            icon: <LayoutTemplate className="h-4 w-4" />
        }
    ]
    // 1. Strict validation
    const isValidProject = projectId && projectId !== 'null' && projectId !== 'undefined';

    const project = useQuery(
        api.projects.getProject,
        isValidProject ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const hasCanvas = pathname.includes('canvas')
    const hasStyleGuide = pathname.includes('style-guide')

    const creditBalance = useQuery(api.subscription.getCreditsBalance, {
        userId: me.id as Id<'users'>,
    })

    // Profile image na ho (jaise email/password signup) to user ke naam/email se
    // initials bana kar avatar me dikhate hain — Google/Figma jaisa.
    const initials = (me?.name || me?.email || '')
        .trim()
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')

    // Avatar ka random-but-stable Google-style color (naam/email se derive)
    const avatarBg = avatarColor(me?.name || me?.email || '')

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard/${me.name}`}
                    className="w-8 h-8 rounded-full border-3 border-white bg-black flex items-center justify-center">

                    <div className="w-4 h-4 rounded-full bg-white"></div>
                </Link>
                {!hasCanvas ||
                    (!hasStyleGuide && (
                        <div className="lg:inline-block hidden rounded-full text-primary/60 border border-white/[0.12] backdrop-blur-xl bg-white/[0.08] px-4 py-2 text-sm saturate-150">
                            Project / {project?.name}
                        </div>
                    ))}
            </div>

            <div className="lg:flex hidden items-center justify-center gap-2">
                <div className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-2 saturate-150">
                    {tabs.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={[
                                'group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
                                `${pathname}?project=${projectId}` === t.href
                                    ? 'bg-white/[0.12] text-white border border-white/[0.16] backdrop-blur-sm'
                                    : 'text-zinc-400 border border-transparent hover:bg-white/[0.06] hover:text-zinc-200'
                            ].join(' ')}>
                            <span
                                className={
                                    `${pathname}?project=${projectId}` === t.href
                                        ? 'opacity-100'
                                        : 'opacity-70 group-hover:opacity-90'}
                            >
                                {t.icon}
                            </span>
                            <span>{t.label}</span>
                        </Link>
                    ))}

                </div>
            </div>

            <div className="flex items-center gap-4 justify-end">
                <span className="text-sm text-white/50">{creditBalance} credits</span>
                {hasCanvas && <PresenceAvatars />}
                {hasCanvas && <ShareProject />}
                <Button
                    variant="secondary"
                    className="rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12]"
                >
                    <CircleQuestionMark className="size-5 text-white" />
                </Button>

                <Avatar className="size-12 ml-2">
                    {/* Image sirf tab render karo jab mojood ho — warna Radix fallback
                        reliably nahi dikhता (empty src). Image na hone par initials. */}
                    {me.image ? (
                        <AvatarImage src={me.image} alt={me.name || ''} />
                    ) : null}
                    <AvatarFallback
                        style={{ backgroundColor: avatarBg }}
                        className="flex h-full w-full items-center justify-center rounded-full text-white text-sm font-semibold uppercase border border-white/[0.12]">
                        {initials || <User className="size-5 text-white" />}
                    </AvatarFallback>
                </Avatar>
                {/* Logout — click karne par session sign out hota hai aur user
                    sign-in page par redirect ho jata hai (useAuth.handleSignOut) */}
                <Button
                    onClick={handleSignOut}
                    variant="secondary"
                    aria-label="Log out"
                    title="Log out"
                    className="rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12]"
                >
                    <LogOut className="size-5 text-white" />
                </Button>
                {hasCanvas && <Autosave />}
                {!hasCanvas && !hasStyleGuide && <CreateProject />}
            </div>
        </div>
    )
}
export default Navbar