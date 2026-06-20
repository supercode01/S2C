import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs' // SMTP ke liye Node runtime zaroori

export async function POST(req: NextRequest) {
    try {
        const { name, email, message } = await req.json()

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return NextResponse.json(
                { error: 'name, email and message are required' },
                { status: 400 }
            )
        }

        const emailPattern =
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
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

        // Mail yahan aayegi — default aapka apna Gmail, ya CONTACT_RECEIVER_EMAIL set karein
        const to = process.env.CONTACT_RECEIVER_EMAIL || process.env.GMAIL_USER

        // user input ko HTML mein safe banane ke liye
        const safe = (s: string) =>
            s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const html = `
            <div style="font-family: sans-serif; max-width: 520px; margin: auto;">
                <h2>New contact message — Sketch2Design</h2>
                <p><b>Name:</b> ${safe(name)}</p>
                <p><b>Email:</b> ${safe(email)}</p>
                <p><b>Message:</b></p>
                <p style="white-space: pre-wrap; background:#f5f5f5; color:#111;
                          padding:12px; border-radius:8px;">${safe(message)}</p>
            </div>
        `

        await transporter.sendMail({
            from: `"S2C Contact" <${process.env.GMAIL_USER}>`,
            to,
            replyTo: email, // reply dabane par seedha user ko jaye
            subject: `New contact from ${name}`,
            html,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('❌ Contact email failed:', err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to send' },
            { status: 500 }
        )
    }
}
