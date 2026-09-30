import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-sm shadow-indigo-900/30",
  secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
  ghost:     "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200",
  danger:    "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30",
  outline:   "bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-800",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
