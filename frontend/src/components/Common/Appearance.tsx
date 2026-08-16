import { Check, Monitor, Moon, Sun } from "lucide-react"

import { type Accent, type Theme, useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type LucideIcon = React.FC<React.SVGProps<SVGSVGElement>>

const ICON_MAP: Record<Theme, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

const ACCENT_SWATCH: Record<Accent, string> = {
  indigo: "bg-[oklch(0.6_0.18_280)]",
  emerald: "bg-[oklch(0.55_0.16_160)]",
  rose: "bg-[oklch(0.58_0.2_350)]",
  amber: "bg-[oklch(0.66_0.16_85)]",
  sky: "bg-[oklch(0.55_0.16_245)]",
}

const ACCENT_LABEL: Record<Accent, string> = {
  indigo: "Indigo",
  emerald: "Emerald",
  rose: "Rose",
  amber: "Amber",
  sky: "Sky",
}

function AccentPicker() {
  const { accent, setAccent } = useTheme()

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        Accent color
      </DropdownMenuLabel>
      <div className="flex items-center gap-2 px-2 py-1.5">
        {(Object.keys(ACCENT_SWATCH) as Accent[]).map((a) => (
          <button
            key={a}
            type="button"
            title={ACCENT_LABEL[a]}
            data-testid={`accent-${a}`}
            onClick={() => setAccent(a)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border border-transparent transition-transform hover:scale-110",
              ACCENT_SWATCH[a],
              accent === a &&
                "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            {accent === a && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
        ))}
      </div>
    </>
  )
}

export const SidebarAppearance = () => {
  const { isMobile } = useSidebar()
  const { setTheme, theme } = useTheme()
  const Icon = ICON_MAP[theme]

  return (
    <SidebarMenuItem>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Appearance" data-testid="theme-button">
            <Icon className="size-4 text-muted-foreground" />
            <span>Appearance</span>
            <span className="sr-only">Toggle theme</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align="end"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        >
          <DropdownMenuItem
            data-testid="light-mode"
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="dark-mode"
            onClick={() => setTheme("dark")}
          >
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
          <AccentPicker />
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export const Appearance = () => {
  const { setTheme } = useTheme()

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button data-testid="theme-button" variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid="light-mode"
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="dark-mode"
            onClick={() => setTheme("dark")}
          >
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
          <AccentPicker />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
