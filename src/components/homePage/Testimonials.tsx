"use client";

import Image from "next/image";

type T = { quote: string; name: string; role: string; img: string };

const testimonials: T[] = [
  { quote: "I uploaded a moodboard and Sketch2Design instantly nailed our colors and typography. It's like having a design system on tap.", name: "Jake", role: "Founder, ElevateHub", img: "/images/testimonial-1.webp" },
  { quote: "I sketched a rough layout on the canvas and got real, editable UI back in seconds. What used to take hours now takes minutes.", name: "Olivia", role: "Product Designer", img: "/images/testimonial-3.webp" },
  { quote: "The design chat is magic—I just describe the change in plain English and it happens. Non-designers on my team can actually contribute now.", name: "Luca Rossi", role: "Product Lead, EMEA", img: "/images/testimonial-6-1.webp" },
  { quote: "Generating the whole website workflow at once saved us weeks of wireframing. We went from idea to clickable UI the same day.", name: "Sophia", role: "Startup Founder", img: "/images/testimonial-4.webp" },
  { quote: "It strikes the perfect balance—AI does the heavy lifting, and I still fine-tune everything by hand on the canvas.", name: "Emily Carter", role: "Senior UI Designer", img: "/images/testimonial-5.webp" },
  { quote: "From moodboard to polished components, the flow is seamless. Sketch2Design has cut our design turnaround by more than half.", name: "James O'Neill", role: "Head of Design", img: "/images/testimonial-7-1.webp" },
];

const row1 = testimonials.slice(0, 3);
const row2 = testimonials.slice(3, 6);

function Card({ t }: { t: T }) {
  return (
    <div className="w-[340px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex items-stretch gap-4">
      <div className="relative w-24 shrink-0 rounded-xl overflow-hidden bg-[var(--surface-2)]">
        <Image src={t.img} alt={t.name} fill className="object-cover" />
      </div>
      <div className="flex flex-col">
        <span className="text-[var(--accent-2)] text-3xl leading-none font-display">&ldquo;</span>
        <p className="text-sm text-[var(--text)]/90 leading-relaxed">{t.quote}</p>
        <div className="mt-auto pt-3">
          <p className="font-semibold text-sm">{t.name}</p>
          <p className="text-xs text-[var(--muted)]">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 overflow-hidden">
      <div className="px-5">
        <p className="text-center text-sm font-semibold text-[var(--accent-2)] uppercase tracking-widest">
          Testimonials
        </p>
        <h2 className="mt-3 text-center font-display text-3xl md:text-4xl font-bold">
          Loved by Designers and Builders Alike
        </h2>
        <p className="mt-3 text-center text-[var(--muted)] max-w-2xl mx-auto">
          See how teams are turning sketches and moodboards into real UI with Sketch2Design.
        </p>
      </div>

      {/* edges pe fade ke liye wrapper */}
      <div className="mt-14 space-y-5 fade-x">
        {/* Row 1 — left ki taraf */}
        <div className="marquee-row flex overflow-hidden">
          <div className="marquee-track marquee-left">
            {[...row1, ...row1, ...row1].map((t, i) => (
              <Card key={`a-${i}`} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2 — right ki taraf */}
        <div className="marquee-row flex overflow-hidden">
          <div className="marquee-track marquee-right">
            {[...row2, ...row2, ...row2].map((t, i) => (
              <Card key={`b-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}