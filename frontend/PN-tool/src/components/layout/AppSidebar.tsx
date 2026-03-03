import { FolderKanban, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth";
import staakLogoDark from "@/assets/staak-logo-dark.png";
import staakIcon from "@/assets/staak-icon.png";
import { generateShortName } from "@/lib/profile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarFooterContent } from "./SidebarFooterContent";
import { HelpDocumentation } from "@/components/shared/HelpDocumentation";

const mainNavItems = [
  { title: "Projects", url: "/", icon: FolderKanban },
  { title: "Clients", url: "/clients", icon: Building2 },
];

const adminNavItems = [
  { title: "Users", url: "/users", icon: Users },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { isAdmin, user, profile } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const shortName = generateShortName(profile, user?.email);

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className={isCollapsed ? "p-2 flex items-center justify-center" : "p-4"}>
        <div
          className={`flex items-center cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
          onClick={() => navigate('/')}
        >
          {isCollapsed ? (
            <img
              src={staakIcon}
              alt="STAAK"
              className="h-6 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <img
              src={staakLogoDark}
              alt="STAAK"
              className="w-full px-2"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation Group - WITH DIVIDER AND LABEL */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Sidebar Footer - Avatar + Help icon only (NO Sign Out) */}
      <SidebarFooter className="p-4 border-t">
        <SidebarFooterContent
          collapsed={isCollapsed}
          shortName={shortName}
          onProfileClick={() => navigate('/profile')}
          helpComponent={<HelpDocumentation collapsed={isCollapsed} isAdmin={isAdmin} />}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
