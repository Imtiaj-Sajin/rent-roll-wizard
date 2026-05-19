import { FileText, Settings2, Wrench, Users, BarChart3 } from "lucide-react";
import { useLocation } from "react-router-dom";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Upload", url: "/upload", icon: FileText },
  { title: "Extract", url: "/extract", icon: Settings2 },
  { title: "Tools", url: "/tools", icon: Wrench },
  { title: "Users", url: "/users", icon: Users },
  { title: "Usage", url: "/usage", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-[--sidebar-width]"}>
      <SidebarHeader className="border-b border-sidebar-border/60">
        <div className="flex items-center gap-2 px-2 py-1">
          <img
            src="/favicon.ico"
            alt="Rent Roll Wizard"
            className="h-7 w-7 rounded-lg shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">Rent Roll</span>
              <span className="text-[10px] text-muted-foreground">Wizard</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end
                        className="rounded-md"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon />
                        {!collapsed ? <span>{item.title}</span> : null}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
