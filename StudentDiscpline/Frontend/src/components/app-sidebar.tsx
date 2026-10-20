"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronRight, AlertCircle } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { NAV_ITEMS } from "@/lib/nav-config"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<string[]>([])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    )
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="p-4 flex justify-center">
        <Link href="/dashboard" className="flex justify-center">
          <Image
            src="/logo.png"
            alt="ShulePlus"
            width={0}
            height={0}
            sizes="100vw"
            className="h-9 w-auto object-contain brightness-0 invert"
            priority
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                if (item.children) {
                  const open = openGroups.includes(item.label)
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        tooltip={item.label}
                        onClick={() => toggleGroup(item.label)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                        <ChevronRight
                          className={`ml-auto transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                        />
                      </SidebarMenuButton>
                      {open && (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                isActive={isActive(child.href)}
                                render={
                                  <Link href={child.href}>
                                    <child.icon />
                                    <span>{child.label}</span>
                                  </Link>
                                }
                              />
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(item.href!)}
                      tooltip={item.label}
                      render={
                        <Link href={item.href!}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Report an Issue">
              <AlertCircle />
              <span>Report an Issue</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
