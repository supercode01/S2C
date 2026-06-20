"use client";

import { useState } from "react";
import Image from "next/image";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Showcase", href: "#templates" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center">
          {/* apni logo /public/images/ mein rakho */}
          <Image
            src="/images/Logo_final.png"
            alt="Sketch2Design"
            width={140}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--landing-text)] hover:text-[var(--landing-muted)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="/auth/sign-in" className="text-sm text-[var(--landing-text)] hover:text-[var(--landing-muted)]">
            Log In
          </a>
          <a
            href="/auth/sign-up"
            className="text-sm font-semibold rounded-full px-4 py-2 bg-[var(--landing-accent)] hover:opacity-90 transition"
          >
            Sign Up
          </a>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="w-6 h-0.5 bg-[var(--landing-text)]" />
          <span className="w-6 h-0.5 bg-[var(--landing-text)]" />
          <span className="w-6 h-0.5 bg-[var(--landing-text)]" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[var(--landing-muted)] hover:text-[var(--landing-text)]"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/auth/sign-up"
            onClick={() => setOpen(false)}
            className="text-center text-sm font-semibold rounded-full px-4 py-2 bg-[var(--landing-accent)]"
          >
            Sign Up
          </a>
        </div>
      )}
    </header>
  );
}
