import { Briefcase, Home, Users } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { UtilsService } from "@/client"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Briefcase, title: "Items", path: "/items" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const { data: versionInfo } = useQuery({
    queryKey: ["version"],
    queryFn: () => UtilsService.appVersion(),
  }) as { data: { name: string; version: string } | undefined }

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
        <p className="px-4 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {versionInfo?.name} v{versionInfo?.version}
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
