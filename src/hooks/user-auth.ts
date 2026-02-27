'use client'
import {useAuthActions} from '@convex-dev/auth/react'
import {useRouter} from 'next/navigation'
import {useState} from 'react'
import {useForm} from 'react-hook-form'
import { zodResolver } from "@hookform/resolvers/zod";
import{z} from 'zod'

const signInSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const signUpSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type signInData = z.infer<typeof signInSchema>
type signUpData = z.infer<typeof signUpSchema>

export const useAuth = () => {
    const {signIn, signOut} = useAuthActions()
    const router = useRouter()
    const [isloading, setloading] = useState(false)

    const signInForm = useForm<signInData>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    const signUpForm = useForm<signUpData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
        },
    })

    const handleSignIn = async (data: signInData) => {
        setloading(true)
        try{
            await signIn('password', {
                email: data.email,
                password: data.password,
                flow: 'signIn',
            })
            router.push('/dashboard')
        }
        catch (error) {
            console.error (error)
            signInForm.setError('password', {
                message: 'Invalid email or password',
            })
        }
        finally {
            setloading(false)
        }
    }

    const handleSignUp = async (data: signUpData) => {
        setloading(true)
        try{
            await signIn('password', {
                email: data.email,
                password: data.password,
                name: `${data.firstName} ${data.lastName}`,
                flow: 'signUp',
            })
            router.push('/dashboard')
        }
        catch(error){
            console.error ('Sign up error:', error)
            signUpForm.setError('root', {
                message: 'Failed to create account. Email may already exist',
            })
        } finally{
        setloading(false)
        }
    }

    const handleSignOut = async () =>{
        try {
            await signOut()
            router.push('/auth/sign-in')
        } catch (error) {
            console.error('Sign Out error:', error)
        }
    }

    return {
        signInForm,
        signUpForm,
        handleSignIn,
        handleSignOut,
        handleSignUp,
        isloading,
    }
}