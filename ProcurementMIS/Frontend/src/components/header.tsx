"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Search, Bell, LogOut, User, AlertCircle, ChevronDown, Menu } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { getToken, clearTokens } from "@/shared/auth-token"
import { FLAT_NAV } from "@/lib/nav-config"
import axios from "axios"

const labelByHref = Object.fromEntries(FLAT_NAV.map((n) => [n.href, n.label]))

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  return segments.map((_, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label =
      labelByHref[href] ??
      segments[i]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    return { href, label }
  })
}

export function Header() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleLogout = async () => {
    const token = getToken()
    const iamApiUrl =
      process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:3001/api/v1"
    const iamUrl = process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000"
    try {
      if (token) {
        await axios.post(
          `${iamApiUrl}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    } catch {
      /* ignore */
    }
    clearTokens()
    window.location.href = iamUrl
  }

  const emailPrefix = user?.email?.split("@")[0] ?? "??"
  const initials = emailPrefix.slice(0, 2).toUpperCase()
  const isSidebarOpen = state === "expanded"
  const roleLabel = user?.roles?.includes("organization_admin")
    ? "Organization Admin"
    : "Procurement Officer"

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <button onClick={() => toggleSidebar()} className="rounded-lg p-2 text-navy hover:bg-gray-100 transition-colors">
        <Menu className="h-5 w-5" />
      </button>
      {!isSidebarOpen && (
        <Link href="/dashboard" className="shrink-0">
          <Image
            src="/logo.png"
            alt="ShulePlus"
            width={0}
            height={0}
            sizes="100vw"
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
      )}

      <div className="flex items-center justify-between w-full gap-4">
        <div className="relative flex-1 max-w-md hidden md:block">
          <input
            placeholder="Search requests, orders, suppliers..."
            className="w-full rounded-lg border bg-gray-50 pl-4 pr-10 py-2 text-sm outline-none transition-all focus:border-primary focus:bg-white"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button className="relative rounded-full border p-2 px-4 text-muted-foreground transition-colors hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-danger" />
          </button>

          <div ref={menuRef} className="rounded-full border ">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg p-1.5 pr-2 sm:pr-3 transition-colors hover:bg-gray-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-navy">
                  {emailPrefix}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <ChevronDown
                className={`hidden sm:flex h-4 w-4 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 animate-in overflow-hidden rounded-xl border bg-white shadow-lg ring-1 ring-black/5 slide-in-from-top-2 fade-in duration-150">
                <div className="border-b bg-gray-50/50 px-4 py-3">
                  <p className="truncate text-sm font-medium text-navy">
                    {user?.email ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Procurement Management
                  </p>
                </div>

                <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-navy transition-colors hover:bg-gray-50">
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-navy transition-colors hover:bg-gray-50">
                  <AlertCircle className="h-4 w-4" />
                  Report Issue
                </button>

                <div className="border-t" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
