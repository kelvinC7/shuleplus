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
              {(NAV_ITEMS ?? []).filter(Boolean).map((item, idx) => {
                const itemLabel = item?.label ?? ''
                const ItemIcon = item?.icon

                if (item?.children) {
                  const open = openGroups.includes(itemLabel)
                  return (
                    <SidebarMenuItem key={itemLabel || idx}>
                      <SidebarMenuButton
                        tooltip={itemLabel}
                        onClick={() => toggleGroup(itemLabel)}
                      >
                        {ItemIcon ? <ItemIcon /> : null}
                        <span>{itemLabel}</span>
                        <ChevronRight
                          className={`ml-auto transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                        />
                      </SidebarMenuButton>
                      {open && (
                        <SidebarMenuSub>
                          {(item.children ?? []).filter(Boolean).map((child, cIdx) =>
                            child?.href ? (
                              <SidebarMenuSubItem key={child.href ?? cIdx}>
                                <SidebarMenuSubButton
                                  isActive={isActive(child.href)}
                                  render={
                                    <Link href={child.href}>
                                      {child.icon ? <child.icon /> : null}
                                      <span>{child.label ?? ''}</span>
                                    </Link>
                                  }
                                />
                              </SidebarMenuSubItem>
                            ) : null
                          )}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                }

                if (!item?.href) return null

                return (
                  <SidebarMenuItem key={item.href ?? idx}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={itemLabel}
                      render={
                        <Link href={item.href}>
                          {ItemIcon ? <ItemIcon /> : null}
                          <span>{itemLabel}</span>
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
