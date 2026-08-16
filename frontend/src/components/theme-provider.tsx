import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

export type Theme = "dark" | "light" | "system"
export type Accent = "indigo" | "emerald" | "rose" | "amber" | "sky"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultAccent?: Accent
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: "dark" | "light"
  accent: Accent
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
}

const ACCENTS: Accent[] = ["indigo", "emerald", "rose", "amber", "sky"]

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  accent: "indigo",
  setTheme: () => null,
  setAccent: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function isAccent(value: string | null): value is Accent {
  return value !== null && (ACCENTS as string[]).includes(value)
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultAccent = "indigo",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  )
  const [accent, setAccent] = useState<Accent>(() => {
    const stored = localStorage.getItem(`${storageKey}-accent`)
    return isAccent(stored) ? stored : defaultAccent
  })

  const getResolvedTheme = useCallback((theme: Theme): "dark" | "light" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }
    return theme
  }, [])

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() =>
    getResolvedTheme(theme),
  )

  const updateTheme = useCallback((newTheme: Theme, newAccent: Accent) => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark", ...ACCENTS.map((a) => `accent-${a}`))

    root.classList.add(`accent-${newAccent}`)

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(newTheme)
  }, [])

  useEffect(() => {
    updateTheme(theme, accent)
    setResolvedTheme(getResolvedTheme(theme))

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        updateTheme("system", accent)
        setResolvedTheme(getResolvedTheme("system"))
      }
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, accent, updateTheme, getResolvedTheme])

  const value = {
    theme,
    resolvedTheme,
    accent,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    setAccent: (accent: Accent) => {
      localStorage.setItem(`${storageKey}-accent`, accent)
      setAccent(accent)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

export { ACCENTS }
