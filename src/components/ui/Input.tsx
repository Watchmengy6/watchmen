import { cn } from "@/lib/utils/cn";
import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl bg-ink-800 hairline px-4 text-[15px] text-white",
          "placeholder:text-ink-400 outline-none transition-shadow",
          "focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400/30",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl bg-ink-800 hairline px-4 py-3 text-[15px] text-white",
        "placeholder:text-ink-400 outline-none transition-shadow resize-none",
        "focus:ring-2 focus:ring-gold-400/40 focus:border-gold-400/30",
        className,
      )}
      {...rest}
    />
  );
});

export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-[13px] font-medium text-ink-200 mb-1.5", className)}>
      {children}
    </label>
  );
}
