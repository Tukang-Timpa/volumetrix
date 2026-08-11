import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/40 disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
