"use client";

import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import clsx from "clsx";
import {
  Banknote,
  Calendar,
  Folder,
  HomeIcon,
  Settings,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: Folder,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: Banknote,
  },
];

const secondaryNavItems: NavItem[] = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function DashboardSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div
      className={`transition-all duration-500 lg:block hidden border-r h-full ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-[55px] items-center px-3 w-full justify-between border-b">
          <button onClick={toggleSidebar} className="p-2">
            <ChevronLeft
              className={`transition-transform opacity-80 font- duration-200 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        <div className="flex-1 mt-2 overflow-auto">
          <nav className="grid items-start px-2 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={clsx(
                  "flex items-center gap-2 rounded-lg p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                  {
                    "bg-gray-100 dark:bg-neutral-800 dark:text-gray-50":
                      pathname === item.href,
                  }
                )}
                href={item.href}
              >
                <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white">
                  <item.icon className="h-4 w-4" />
                </div>
                {!collapsed && item.label}
              </Link>
            ))}
            <Separator className="my-3" />
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                className={clsx(
                  "flex items-center gap-2 rounded-lg p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                  {
                    "bg-gray-100 dark:bg-neutral-800 dark:text-gray-50":
                      pathname === item.href,
                  }
                )}
                href={item.href}
              >
                <div className="border rounded-lg dark:bg-black dark:border-gray-800 border-gray-400 p-1 bg-white">
                  <item.icon className="h-4 w-4" />
                </div>
                {!collapsed && item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
