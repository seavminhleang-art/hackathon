"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Bottom sheet on phones, centered dialog on desktop. Closes on Escape and backdrop tap.
 * Render it conditionally: {open && <Sheet …/>}.
 */
export function Sheet({
  title,
  icon,
  onClose,
  children,
  tone = "default",
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const { t } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] lg:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-sand p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-raised lg:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-2 h-1.5 w-10 rounded-full bg-line-strong lg:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h2 className={`flex items-center gap-2 text-title font-bold ${tone === "danger" ? "text-danger" : "text-ink"}`}>
            {icon}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label={t.close}
            className="flex size-11 items-center justify-center rounded-full bg-sand-deep text-ink hover:bg-line"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
