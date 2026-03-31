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

export const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}min ${secs.toString().padStart(2, "0")}s`;
  }

  if (mins > 0) {
    return `${mins}min ${secs.toString().padStart(2, "0")}s`;
  }

  return `${secs}s`;
};