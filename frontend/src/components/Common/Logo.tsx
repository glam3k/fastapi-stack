import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "text-lg font-bold text-foreground bg-clip-text bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 transition-all",
            className,
          )}
        >
          JCRM
        </span>
        <span
          className={cn(
            "text-sm font-bold text-foreground bg-clip-text bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 transition-all hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          J
        </span>
      </>
    ) : (
      <span
        className={cn(
          variant === "full"
            ? "text-lg font-bold text-foreground bg-clip-text bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 transition-all"
            : "text-sm font-bold text-foreground bg-clip-text bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 transition-all",
          className,
        )}
      >
        {variant === "full" ? "JCRM" : "J"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}