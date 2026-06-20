"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Do I need design skills to use Sketch2Design?",
    a: "Not at all! Just upload a moodboard and sketch your idea—our AI generates the colors, typography and UI for you. You can refine everything with the design chat or by hand.",
  },
  {
    q: "How does Sketch2Design create my colors and typography?",
    a: "You upload moodboard images, and our AI analyzes them to generate a cohesive color palette and a matching typography system tailored to your brand's look and feel.",
  },
  {
    q: "Can I edit the UI after it's generated?",
    a: "Yes! Edit any component through the NLP design chat—just describe what you want—or fine-tune spacing, colors, text and layout manually on the canvas.",
  },
  {
    q: "Can it generate a whole website, not just one screen?",
    a: "Absolutely. With the workflow option you can generate an entire website's flow—pages, structure and components—in a single click.",
  },
  {
    q: "Is there a free plan available?",
    a: "Yes! Our free plan lets you generate palettes, typography and UI without a credit card. Upgrade any time to unlock design chat, workflow generation and more projects.",
  },
];

export default function Faq() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-5">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* LEFT — heading + contact */}
        <div className="lg:sticky lg:top-28">
          <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-2)]">
            FAQs
          </span>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-bold leading-tight">
            Got Questions?
            <br />
            We&apos;ve Got Answers!
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            Find quick answers or contact our support team.
          </p>
          <a
            href="#"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/50 bg-[var(--surface)] px-6 py-3 font-semibold shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent)]/10 transition"
          >
            Contact Us
            <span className="text-[var(--accent-2)]">✉</span>
          </a>
        </div>

        {/* RIGHT — accordion (divider style) */}
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {faqs.map((f, i) => {
            const open = active === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setActive(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span
                    className={`font-semibold transition-colors ${
                      open ? "text-[var(--text)]" : "text-[var(--text)]/90 group-hover:text-[var(--text)]"
                    }`}
                  >
                    {f.q}
                  </span>
                  <span
                    className={`shrink-0 text-xl text-[var(--accent-2)] transition-transform duration-300 ${
                      open ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                  }`}
                >
                  <p className="overflow-hidden text-sm text-[var(--muted)] leading-relaxed pr-8">
                    {f.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}