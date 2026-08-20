import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 pr-8 py-1 text-sm text-neutral-100 outline-none transition-colors focus:border-teal-400/60 focus:ring-1 focus:ring-teal-400/40 disabled:opacity-40",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
    </div>
  )
);
Select.displayName = "Select";
