'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Google from '@/components/buttons/oauth/google'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

export default function LoginPage() {
    const { signUpForm, handleSignUp, isloading } = useAuth()
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = signUpForm

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <form
                onSubmit={handleSubmit(handleSignUp)}
                className="bg-muted m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border shadow-md shadow-zinc-950/5 dark:[--color-muted:var(--color-zinc-900)]">
                <div className="bg-card -m-px rounded-[calc(var(--radius)+.125rem)] border p-8 pb-6">
                    <div className="text-center">
                        <h1 className="mb-1 mt-4 text-xl font-semibold">Create Account</h1>
                        <p className="text-sm">Create an account to get started</p>
                    </div>

                    <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="firstname" className="block text-sm">
                                    First Name
                                </Label>
                                <Input
                                    type="text"
                                    id="firstname"
                                    {...register('firstName', { required: 'Firstname is required' })}
                                />
                                {errors.firstName && (
                                    <p className="text-red-500 text-xs">{errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastname" className="block text-sm">
                                    Last Name
                                </Label>
                                <Input
                                    type="text"
                                    id="lastname"
                                    {...register('lastName', { required: 'Lastname is required' })}
                                />
                                {errors.lastName && (
                                    <p className="text-red-500 text-xs">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="block text-sm">
                                Email
                            </Label>
                            <Input
                                type="email"
                                id="email"
                                {...register('email', { required: 'Email is required' })}
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pwd" className="text-sm">
                                    Password
                                </Label>
                                <Button asChild variant="link" size="sm">
                                    <Link href="#" className="text-sm">
                                        Forgot your Password?
                                    </Link>
                                </Button>
                            </div>
                            <Input
                                type="password"
                                id="pwd"
                                {...register('password', { required: 'Password is required' })}
                            />
                            {errors.password && (
                                <p className="text-red-500 text-xs">{errors.password.message}</p>
                            )}
                        </div>

                        {errors.root && (
                            <p className="text-red-500 text-xs text-center">{errors.root.message}</p>
                        )}

                        {/* ✅ type="submit" aur disabled add kiya */}
                        <Button type="submit" disabled={isloading} className="w-full">
                            {isloading ? 'Signing Up...' : 'Sign Up'}
                        </Button>
                    </div>

                    <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <hr className="border-dashed" />
                        <span className="text-muted-foreground text-xs">Or continue With</span>
                        <hr className="border-dashed" />
                    </div>

                    <div>
                        <Google />
            
                    </div>
                </div>

                <div className="p-3">
                    <p className="text-accent-foreground text-center text-sm">
                        Have an account?
                        <Button asChild variant="link" className="px-2">
                            <Link href="/auth/sign-in">Sign In</Link>
                        </Button>
                    </p>
                </div>
            </form>
        </section>
    )
}