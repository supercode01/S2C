import { convexAuth } from "@convex-dev/auth/server";
import Google from '@auth/core/providers/google'
import {Password} from '@convex-dev/auth/providers/Password'

// Naya user (Password signup YA Google auth) banne par usay free credits dene
// ke liye ek "free" active subscription bana dete hain. Credits subscription
// row par store hote hain (getCreditsBalance/consumeCredits is hi row ko padhte
// hain), is liye free tier bhi ek subscription ke roop me hota hai — status
// 'active' taake user dashboard access kar sake aur AI generate kar sake jab tak
// credits khatam na ho jayein. Khatam hone par usay credits buy karne padenge.
const FREE_SIGNUP_CREDITS = 10

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    // Default Password provider sirf email save karta hai. Signup par bheja gaya
    // `name` bhi user document me save karne ke liye custom profile() chahiye.
    Password({
      profile(params) {
        // Convex me `undefined` valid value nahi — is liye `name` sirf tabhi
        // return karo jab woh actually mojood ho, warna usay omit kar do.
        const name = (params.name as string | undefined)?.trim()
        return {
          email: params.email as string,
          ...(name ? { name } : {}),
        }
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      // Sirf naye users ke liye — update par kuch mat karo
      if (args.existingUserId) return

      const userId = args.userId

      // NOTE: is auth callback me ctx.db generic DataModel ke against typed hota
      // hai (library ko hamari app schema ki tables/indexes ka pata nahi), is
      // liye `any` cast zaroori hai warna `by_userId` index typecheck fail karta
      // hai. Runtime par index/insert bilkul theek chalte hain.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any

      // Agar kisi wajah se pehle se subscription mojood hai to dobara mat banao
      const existing = await db
        .query('subscriptions')
        .withIndex('by_userId', (q: any) => q.eq('userId', userId))
        .first()
      if (existing) return

      await db.insert('subscriptions', {
        userId,
        // Yeh Polar ki real subscription nahi — free tier ko pehchanne ke liye
        // placeholder IDs (billing guard inhi se paid vs free farq karta hai).
        polarCustomerId: '',
        polarSubscriptionId: `free_${userId}`,
        planCode: 'free',
        status: 'active',
        creditsBalance: FREE_SIGNUP_CREDITS,
        creditsGrantPerPeriod: 0, // free tier me periodic grant nahi hota
        creditsRolloverLimit: FREE_SIGNUP_CREDITS,
      })
    },
  },
});
