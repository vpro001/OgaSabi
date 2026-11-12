import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Buttons are painted blocks: ink outline, hard shadow, and they sink when pressed.
// `accent` (danfo yellow) is the one primary action on a screen.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-2 border-foreground font-label text-sm font-bold tracking-wide whitespace-nowrap uppercase transition-[transform,box-shadow,background-color] duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[3px_3px_0_var(--accent)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--accent)] active:translate-0 active:shadow-none",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-0 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-0 active:shadow-none",
        outline: "bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost:
          "border-transparent text-foreground underline decoration-2 underline-offset-4 hover:border-foreground hover:no-underline",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-md active:translate-0 active:shadow-none",
        link: "border-transparent text-foreground underline decoration-2 underline-offset-4",
      },
      size: {
        default: "min-h-12 px-5",
        sm: "min-h-10 px-3.5 text-xs",
        lg: "min-h-14 px-7 text-base",
        icon: "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
