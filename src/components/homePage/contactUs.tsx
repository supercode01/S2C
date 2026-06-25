"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

/* =========================================================
   Contact Us — Modal window (home page ke upar blur ke saath)

   Use:
   1) Home page ko <ContactProvider> mein wrap karein.
   2) Jahan bhi "Contact Us" button chahiye wahan <ContactButton> use karein,
      ya kisi bhi client component mein useContactModal().open() call karein.
   ========================================================= */

type ContactCtx = { open: () => void };

const ContactContext = createContext<ContactCtx | null>(null);

export function useContactModal() {
  const ctx = useContext(ContactContext);
  if (!ctx) {
    throw new Error("useContactModal must be used inside <ContactProvider>");
  }
  return ctx;
}

export function ContactProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <ContactContext.Provider value={{ open }}>
      {children}
      {isOpen && <ContactModal onClose={close} />}
    </ContactContext.Provider>
  );
}

/* Reusable trigger — same styling jaisa pehle anchor par tha */
export function ContactButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useContactModal();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  // Escape se band + background scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface-2)] px-4 py-2.5 text-[var(--landing-text)] placeholder:text-[var(--landing-muted)] outline-none focus:border-[var(--landing-accent)] transition";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Contact Us"
    >
      {/* blur backdrop — click se band */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeUp"
        onClick={onClose}
      />

      {/* modal card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-8 shadow-2xl animate-fadeUp">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-4 text-2xl leading-none text-[var(--landing-muted)] hover:text-[var(--landing-text)] transition"
        >
          &times;
        </button>

        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--landing-accent-2)]">
          Get in touch
        </p>
        <h3 className="mt-2 font-display text-2xl font-bold text-[var(--landing-text)]">
          Contact Us
        </h3>
        <p className="mt-2 text-sm text-[var(--landing-muted)]">
          Have a question or feedback? Send us a message and we&apos;ll get back
          to you soon.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1.5 block text-sm text-[var(--landing-text)]"
            >
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block text-sm text-[var(--landing-text)]"
            >
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="mb-1.5 block text-sm text-[var(--landing-text)]"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              required
              placeholder="How can we help?"
              className={`${inputClass} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--landing-accent)] px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
