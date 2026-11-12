"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** A modal built on the native <dialog>: focus trapping, Escape and the backdrop come for free. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border bg-card p-0 text-foreground shadow-2xl open:animate-in open:fade-in-0 open:zoom-in-95 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none",
        className,
      )}
    >
      {open && (
        <div className="max-h-[88dvh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id="dialog-title" className="text-xl font-extrabold tracking-tight">
                {title}
              </h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-2 -mr-2 inline-flex tap-target items-center justify-center rounded-none text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
