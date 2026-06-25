import SubscribeButton from '@/components/buttons/checkout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { preloadQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'
import { ProfileQuery } from '@/convex/query.config'
import { ConvexUserRaw, normalizeProfile } from '@/types/user'
import { Id } from '../../../../../convex/_generated/dataModel'
import { ContactProvider, ContactButton } from '@/components/homePage/contactUs'

// Pricing plans — Free / Standard / Custom.
// Standard hi asli paid plan hai (Polar checkout). Free signup par milta hai,
// Custom ke liye Contact Us.
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect to explore and start sketching — no card required.',
    features: [
      'Free canvas drawing & sketching',
      '10 starter credits (one-time)',
      'Moodboard → color palette & typography',
      'Manual canvas editing',
      'Community support',
    ],
    cta: 'free' as const,
    highlight: false,
  },
  {
    name: 'Standard',
    price: '$9.99',
    period: '/month',
    description:
      'For freelancers and creators who design regularly. 10 credits refresh every month.',
    features: [
      'Everything in Free',
      '10 credits every month',
      'AI design chat (prompt editing)',
      'Inspiration + canvas → real UI',
      'Premium asset exports',
      'Website workflow generation',
      'Priority support',
    ],
    cta: 'standard' as const,
    highlight: true,
  },
  {
    name: 'Custom',
    price: "Let's talk",
    period: '',
    description: 'For teams with custom credit volume and specific needs.',
    features: [
      'Everything in Standard',
      'Custom monthly credits',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
    ],
    cta: 'custom' as const,
    highlight: false,
  },
]

const page = async () => {
  // Agar user ke paas pehle se REAL paid subscription hai to use payment page
  // dobara dikhane ke bajaye seedha /dashboard par bhej do.
  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    rawProfile._valueJSON as unknown as ConvexUserRaw | null
  )

  if (profile?.id) {
    const paid = await preloadQuery(
      api.subscription.hasActivePaidPlan,
      { userId: profile.id as Id<'users'> },
      { token: await convexAuthNextjsToken() }
    )
    if (paid._valueJSON) {
      redirect('/dashboard')
    }
  }

  return (
    <ContactProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary to-primary/60 rounded-full mb-4 shadow-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Choose your plan
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Start free and upgrade when you need more credits to power your
              AI-assisted design workflow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-start">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`backdrop-blur-xl bg-white/[0.08] border shadow-xl saturate-150 ${
                  plan.highlight
                    ? 'border-primary/40 md:scale-[1.03] shadow-primary/20'
                    : 'border-white/[0.12]'
                }`}
              >
                <CardHeader className="text-center pb-4">
                  {plan.highlight && (
                    <div className="flex items-center justify-center mb-3">
                      <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-xs font-medium rounded-full">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardTitle className="text-xl font-bold text-foreground mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-sm">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground text-sm mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-4 px-6 pb-6">
                  {plan.cta === 'standard' ? (
                    <SubscribeButton />
                  ) : plan.cta === 'custom' ? (
                    <ContactButton className="w-full rounded-full border border-white/[0.16] bg-white/[0.06] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.12]">
                      Contact Us
                    </ContactButton>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="w-full text-center rounded-full border border-white/[0.16] bg-white/[0.06] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.12]"
                    >
                      Continue with Free
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="flex items-center justify-center gap-6 text-muted-foreground text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-400" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-400" />
                <span>30-Day Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-400" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContactProvider>
  )
}

export default page
