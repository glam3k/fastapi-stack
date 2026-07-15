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
            "text-lg font-bold text-foreground group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          JCRM
        </span>
        <span
          className={cn(
            "text-sm font-bold text-foreground hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          J
        </span>
      </>
    ) : (
      <span
        className={cn(
          variant === "full" ? "text-lg font-bold" : "text-sm font-bold",
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