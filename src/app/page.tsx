import Image from "next/image";
import Header from "../components/homePage/Header";
import Faq from "../components/homePage/Faq";
import Reveal from "../components/homePage/Reveal";
import AnimatedHeadline from "../components/homePage/AnimatedHeadline";
import HowItWorks from "../components/homePage/HowItWorks";
import Testimonials from "../components/homePage/Testimonials";
import { ContactProvider, ContactButton } from "../components/homePage/contactUs";

const features = [
  { n: "01", title: "Moodboard-Driven Color & Typography", desc: "Upload a moodboard and our AI extracts a cohesive color palette and typography system for your UI—no more guessing what fits your brand.", img: "/images/Moodboard.png" },

  { n: "02", title: "Inspiration & Canvas to Real UI", desc: "Drop in inspiration images and sketch on the canvas. Sketch2Design generates real, structured UI inside your components in seconds.", img: "/images/Inspiration-Canvas.webp" },

  { n: "03", title: "Design Chat — Edit using Prompt", desc: "Refine any component just by describing it. Our NLP design chat understands requests like 'make it bigger' or 'use a darker accent' and applies them instantly.", img: "/images/Design-chat.png" },

  { n: "04", title: "Full Manual Control", desc: "Prefer hands-on? Fine-tune spacing, colors, text and layout directly on the canvas whenever you want—no limits.", img: "/images/Manual-edit.png" },
  
  { n: "05", title: "Generate Entire Website Workflows", desc: "Think beyond a single screen. Generate a complete website workflow—pages, flow and structure—in a single click.", img: "/images/Workflow.png" },
];


const templates = [
  { label: "Landing Pages", img: "/images/Landing-Page.png" },
  { label: "Dashboards & SaaS", img: "/images/Dashboard.webp" },
  { label: "Mobile App UI", img: "/images/Mobile-app-UI.webp" },
  { label: "E-commerce Screens", img: "/images/E-commerce-store.png" },
  { label: "Portfolio & Creative", img: "/images/Portfolio.jpg" },
  { label: "Design Systems", img: "/images/Design-Systems.webp" },
];

const benefits = [
  { title: "From Sketch to UI in Minutes", desc: "Turn rough sketches and moodboards into polished, production-ready interfaces—without starting from a blank canvas." },
  { title: "A Consistent Design System", desc: "Colors and typography are generated from your moodboard, so every screen stays on-brand automatically." },
  { title: "Edit using Prompt", desc: "Describe the change and the AI design chat handles it—no menus, no manual pixel-pushing required." },
  { title: "No Design Skills Needed", desc: "Founders, devs and marketers can ship great-looking UI without ever opening a design tool." },
  { title: "Build Whole Workflows", desc: "Generate an entire website's flow and pages at once, not just one screen at a time." },
  { title: "Always Stay in Control", desc: "Let the AI do the heavy lifting, then fine-tune everything by hand whenever you want." },
];


const partners = [
  "/images/partner-1.svg", "/images/partner-2.svg", "/images/partner-3.svg",
  "/images/partner-4.svg", "/images/partner-5.svg",
];

const plans = [
  { name: "Free Plan", price: "$0", period: "Per Month", cta: "Start Free", href: "/auth/sign-up", features: ["Moodboard → Palette & Typography", "2 Projects", "Manual Canvas Editing", "Community Support"], highlight: false },
  { name: "Pro Plan", price: "$29", period: "Per Month", cta: "Upgrade to Pro", href: "/auth/sign-up", features: ["Everything in Free", "15 Projects", "Inspiration + Canvas → UI", "Design Chat (NLP Editing)", "Website Workflow Generation", "Priority Support"], highlight: true },
  { name: "Enterprise Plan", price: "Custom", period: "", cta: "Contact Us", href: "mailto:support@sketch2design.com", features: ["Unlimited Projects", "Team Collaboration", "Custom Design System", "API Access", "SSO & Security Controls", "Dedicated Support"], highlight: false },
];

export default function Home() {
  return (
    <ContactProvider>
    <main className="overflow-x-hidden">
      <Header />

      {/* HERO */}
      <section className="relative pt-36 pb-24 px-5">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[var(--landing-accent)]/20 blur-[120px] pointer-events-none" />
        <div className="relative mx-auto max-w-4xl text-center">

          <AnimatedHeadline
            className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.1] text-white"
            text="Turn Sketches into Designs || Instantly with S2D"
          />

          <p className="hl-word delay-1 mt-6 text-lg text-[var(--landing-muted)] max-w-2xl mx-auto">
            Sketch2Design turns your moodboards, inspiration and rough canvas
            sketches into polished UI&mdash;then lets you refine it with an AI
            design chat or by hand.
          </p>
          <div className="hl-word delay-2 mt-8 flex flex-wrap justify-center items-center gap-4">
            <a href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-full bg-[var(--landing-surface)] border border-[var(--landing-border)] px-7 py-3 font-semibold shadow-[0_8px_40px_-6px_rgba(108,92,231,0.55)] hover:bg-[var(--landing-surface-2)] hover:shadow-[0_8px_50px_-4px_rgba(108,92,231,0.7)] transition-all duration-300">Get Started <span className="text-base">↓</span></a>
            <a href="#" className="inline-flex items-center gap-2 px-5 py-3 font-semibold text-[var(--landing-muted)] hover:text-[var(--landing-text)] transition">▶ Watch Demo</a>
          </div>
        </div>

        <Reveal from="scale" delay={150} className="relative mt-16 mx-auto max-w-5xl">
          <div className="absolute -inset-6 bg-gradient-to-tr from-[var(--landing-accent)]/25 via-transparent to-[var(--landing-accent-2)]/20 blur-3xl rounded-[2.5rem] pointer-events-none" />
          <div className="relative animate-float rounded-2xl border border-[var(--landing-border)] overflow-hidden shadow-2xl shadow-[var(--landing-accent)]/20">
            <Image src="/images/h3-demo.webp" alt="Product preview" width={1600} height={950} className="w-full h-auto" priority />
          </div>
        </Reveal>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative overflow-hidden py-12 px-5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[var(--landing-accent)]/10 blur-[140px] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-sm font-semibold text-[var(--landing-accent-2)] uppercase tracking-widest">AI-Powered Sketch to Design</p>
            <h2 className="mt-3 text-center font-display text-3xl md:text-4xl font-bold">Everything You Need to Go From Idea to UI</h2>
            <p className="mt-3 text-center text-[var(--landing-muted)] max-w-2xl mx-auto">From moodboards to a finished interface&mdash;generate, chat-edit, and fine-tune your design, all in one place.</p>
          </Reveal>

          <div className="mt-14 flex flex-wrap justify-center gap-5">
            {features.map((f, i) => (
              <Reveal key={f.n} delay={i * 100} className="w-full md:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]">
                <div className="h-full rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] overflow-hidden hover:border-[var(--landing-accent)]/50 hover:-translate-y-1 transition-all duration-300">
                  <div className="aspect-video bg-[var(--landing-surface-2)] overflow-hidden">
                    <Image src={f.img} alt={f.title} width={600} height={340} className="w-full h-full object-contain bg-black" />
                  </div>
                  <div className="p-7">
                    <span className="font-display text-4xl font-extrabold text-[var(--landing-accent)]/30">{f.n}</span>
                    <h3 className="mt-3 font-display text-lg font-bold">{f.title}</h3>
                    <p className="mt-2 text-sm text-[var(--landing-muted)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <HowItWorks />


      {/* TEMPLATES */}
      <section id="templates" className="relative overflow-hidden py-12 px-5">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[var(--landing-accent-2)]/10 blur-[140px] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-sm font-semibold text-[var(--landing-accent-2)] uppercase tracking-widest">Designed with Sketch2Design</p>
            <h2 className="mt-3 text-center font-display text-3xl md:text-4xl font-bold">Generate UI for Any Use Case</h2>
            <p className="mt-3 text-center text-[var(--landing-muted)] max-w-2xl mx-auto">From landing pages to full dashboards and mobile apps&mdash;sketch it, and let AI turn it into real, editable UI.</p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((t, i) => (
              <Reveal key={t.label} delay={i * 90}>
                <div className="group rounded-2xl border border-[var(--landing-border)] overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden">
                    <Image src={t.img} alt={t.label} width={500} height={375} className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500" />
                  </div>
                  <div className="p-4 bg-[var(--landing-surface)]"><span className="font-semibold">{t.label}</span></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 px-5 bg-[var(--landing-surface)]/40">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-sm font-semibold text-[var(--landing-accent-2)] uppercase tracking-widest">Why Choose Us?</p>
            <h2 className="mt-3 text-center font-display text-3xl md:text-4xl font-bold">More Design Output, Far Less Effort</h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-7 hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-10 h-10 rounded-lg bg-[var(--landing-accent-2)]/15 flex items-center justify-center text-[var(--landing-accent-2)]">✓</div>
                  <h3 className="mt-4 font-display font-bold">{b.title}</h3>
                  <p className="mt-2 text-sm text-[var(--landing-muted)]">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <Testimonials />


      {/* PRICING */}
      <section id="pricing" className="py-12 px-5 bg-[var(--landing-surface)]/40">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-sm font-semibold text-[var(--landing-accent-2)] uppercase tracking-widest">Pricing Plans</p>
            <h2 className="mt-3 text-center font-display text-3xl md:text-4xl font-bold">Plans That Scale With You</h2>
            <p className="mt-3 text-center text-[var(--landing-muted)] max-w-2xl mx-auto">Start free and upgrade as you design more&mdash;flexible, transparent pricing for every team.</p>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-6 items-start">
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 120}>
                <div className={`rounded-3xl border p-8 ${p.highlight ? "border-[var(--landing-accent)] bg-[var(--landing-surface)] md:scale-[1.03] shadow-2xl shadow-[var(--landing-accent)]/20" : "border-[var(--landing-border)] bg-[var(--landing-surface)]"}`}>
                  {p.highlight && (<span className="inline-block mb-4 rounded-full bg-[var(--landing-accent)] px-3 py-1 text-xs font-semibold">Most Popular</span>)}
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-display text-4xl font-extrabold">{p.price}</span>
                    {p.period && <span className="text-[var(--landing-muted)] mb-1">{p.period}</span>}
                  </div>
                  {p.cta === "Contact Us" ? (
                    <ContactButton className={`mt-6 block w-full text-center rounded-full px-5 py-3 font-semibold transition ${p.highlight ? "bg-[var(--landing-accent)] hover:opacity-90" : "border border-[var(--landing-border)] hover:bg-[var(--landing-surface-2)]"}`}>{p.cta}</ContactButton>
                  ) : (
                    <a href={p.href} className={`mt-6 block text-center rounded-full px-5 py-3 font-semibold transition ${p.highlight ? "bg-[var(--landing-accent)] hover:opacity-90" : "border border-[var(--landing-border)] hover:bg-[var(--landing-surface-2)]"}`}>{p.cta}</a>
                  )}
                  <ul className="mt-7 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[var(--landing-muted)]"><span className="text-[var(--landing-accent-2)]">✓</span> {f}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <Faq />

      {/* CTA */}
      <section className="py-12 px-5">
        <Reveal from="scale">
          <div className="relative mx-auto max-w-4xl rounded-3xl border border-[var(--landing-border)] bg-gradient-to-br from-[var(--landing-accent)]/20 to-[var(--landing-surface)] p-12 text-center overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[var(--landing-accent-2)]/20 blur-[100px]" />
            <h2 className="relative font-display text-3xl md:text-4xl font-bold">Your Next Interface Starts with a Sketch!</h2>
            <p className="relative mt-4 text-[var(--landing-muted)] max-w-xl mx-auto">Try it free – no credit card required. Upload a moodboard, sketch your idea, and watch Sketch2Design turn it into real UI.</p>
            <div className="relative mt-8 flex justify-center">
              <a href="/auth/sign-up" className="rounded-full bg-[var(--landing-accent)] px-7 py-3 font-semibold hover:opacity-90 transition">Get Started Free</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--landing-border)] py-12 px-5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <Image src="/images/Logo_final.png" alt="Sketch2Design" width={140} height={32} className="h-8 w-auto" />

          <p className="text-sm text-[var(--landing-muted)]">Turn sketches into Stunning UI with S2D</p>
          <p className="text-sm text-[var(--landing-muted)]">© 2026 Sketch2Design. All rights reserved.</p>
        </div>
      </footer>
    </main>
    </ContactProvider>
  );
}