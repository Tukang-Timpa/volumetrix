import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
  {
    variants: {
      variant: {
        default: "bg-teal-400 text-neutral-950 hover:bg-teal-300 font-semibold",
        secondary: "bg-neutral-800 text-cream-100 hover:bg-neutral-700 border border-neutral-700",
        outline: "border border-neutral-700 text-neutral-200 hover:bg-neutral-800",
        ghost: "text-neutral-300 hover:bg-neutral-800",
        destructive: "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30",
        cream: "bg-cream-100 text-neutral-950 hover:bg-cream-200 font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";
