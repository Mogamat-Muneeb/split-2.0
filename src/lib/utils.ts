import { clsx, type ClassValue } from "clsx"
import { ClipboardList, Plus, Ruler } from "lucide-react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const navItems = [
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
  {
    id: "stats",
    path: "/dashboard/stats",
    icon: Ruler,
    label: "Stats",
  },
];