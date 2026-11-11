import { type ReactNode } from "react";

/** Long-form reading layout for help and legal pages. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5 leading-relaxed [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-extrabold [&_h3]:mt-6 [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p]:text-foreground/85 [&_ul]:list-disc [&_ul]:space-y-1.5">
      {children}
    </div>
  );
}
