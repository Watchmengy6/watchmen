import { cn } from "@/lib/utils/cn";
import { type HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl bg-ink-800/80 hairline shadow-card backdrop-blur-sm",
          "transition-all duration-200",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 pb-5 pt-2 flex items-center gap-2", className)}
      {...rest}
    />
  );
}
