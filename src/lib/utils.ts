import { clsx, type ClassValue } from "clsx"
import { ClipboardList, History, Plus } from "lucide-react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const navItems = [
  {
    id: "stats",
    path: "/dashboard/stats",
    icon: History,
    label: "Stats",
  },
  {
    id: "home",
    path: "/dashboard",
    icon: Plus,
    label: "Home",
  },
  {
    id: "workouts",
    path: "/dashboard/splits",
    icon: ClipboardList,
    label: "Workouts",
  },
];