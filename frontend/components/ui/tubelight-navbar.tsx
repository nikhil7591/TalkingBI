"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  onItemSelect?: (item: NavItem) => void
  mode?: "light" | "dark"
}

export function NavBar({ items, className, onItemSelect, mode = "light" }: NavBarProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(items[0]?.name || "")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const routeMatched = items.find((item) => {
      if (!item.url || item.url.startsWith("#")) {
        return false
      }
      const cleanUrl = item.url.split("?")[0].split("#")[0]
      return cleanUrl === pathname
    })

    if (routeMatched) {
      setActiveTab(routeMatched.name)
      return
    }

    if (!activeTab && items[0]?.name) {
      setActiveTab(items[0].name)
    }
  }, [pathname, items])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "fixed left-1/2 top-3 z-50 -translate-x-1/2 sm:top-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-1 py-1 shadow-lg backdrop-blur-xl",
          mode === "dark"
            ? "border border-slate-600/70 bg-slate-900/60"
            : "border border-white/55 bg-white/40"
        )}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => {
                setActiveTab(item.name)
                onItemSelect?.(item)
              }}
              className={cn(
                "relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-5",
                mode === "dark" ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-900",
                isActive && (mode === "dark" ? "bg-slate-800/85 text-white" : "bg-slate-100/85 text-slate-900"),
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className={cn(
                    "absolute inset-0 -z-10 w-full rounded-full",
                    mode === "dark" ? "bg-sky-500/10" : "bg-slate-800/5"
                  )}
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-sky-500">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-sky-400/35 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-sky-400/35 blur-md" />
                    <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-sky-400/35 blur-sm" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
