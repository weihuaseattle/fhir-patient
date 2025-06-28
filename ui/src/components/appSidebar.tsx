import { 
  Home, 
  Settings, 
  FileText,
  Layers,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="sticky top-12 h-[calc(100vh-3rem)] z-40">
      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Home" isActive={isActive('/')} asChild>
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Proj1 FHIR Patient Management" isActive={isActive('/page1')} asChild>
                  <Link to="/page1">
                    <FileText className="w-4 h-4" />
                    <span>Proj1 FHIR Patient Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Proj2 SMART Patient App on Epic" isActive={isActive('/page2')} asChild>
                  <Link to="/page2">
                    <Layers className="w-4 h-4" />
                    <span>Proj2 SMART Patient App on Epic</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Proj3 SMART Practitioner App on Cerner" isActive={isActive('/page3')} asChild>
                  <Link to="/page3">
                    <Layers className="w-4 h-4" />
                    <span>Proj3 SMART Practitioner App on Cerner</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Proj4 SMART Backend App on Epic" isActive={isActive('/page4')} asChild>
                  <Link to="/page4">
                    <Layers className="w-4 h-4" />
                    <span>Proj4 SMART Backend App on Epic</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Proj5 FHIR Facade on Postgres" isActive={isActive('/page5')} asChild>
                  <Link to="/page5">
                    <Layers className="w-4 h-4" />
                    <span>Proj5 FHIR Facade on Postgres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" isActive={isActive('/settings')} asChild>
              <Link to="/settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
} 