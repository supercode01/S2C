import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs' // SMTP ke liye Node runtime zaroori

export async function POST(req: NextRequest) {
    try {
        const { email, inviteLink, role, inviterName, projectName } =
            await req.json()

        if (!email || !inviteLink) {
            return NextResponse.json(
                { error: 'email and inviteLink required' },
                { status: 400 }
            )
        }
    
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(email) || email.includes('..')) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            )
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        })

        const html = `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2>You've been invited.</h2>
                <p><b>${inviterName ?? 'Someone'}</b> invited you to collaborate on
                   <b>${projectName ?? 'a project'}</b> as a <b>${role ?? 'editor'}</b>.</p>
                <a href="${inviteLink}"
                   style="display:inline-block; background:#000; color:#fff;
                          padding:12px 20px; border-radius:8px;
                          text-decoration:none; margin-top:12px;">
                   Open Project
                </a>
                <p style="color:#888; font-size:12px; margin-top:16px;">
                   Or copy this link: ${inviteLink}
                </p>
            </div>
        `

        await transporter.sendMail({
            from: `"S2C" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `${inviterName ?? 'Someone'} invited you to ${projectName ?? 'a project'}`,
            html,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('❌ Email send failed:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to send' },
            { status: 500 }
        )
    }
}