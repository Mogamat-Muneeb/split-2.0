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


/** Lowercase keys → stable brand colors for muscle focus + exercise icons */
export const MUSCLE_COLOR_MAP: Record<string, string> = {
  chest: "#e11d48",
  pectoralis: "#e11d48",
  shoulders: "#7c3aed",
  delts: "#7c3aed",
  deltoids: "#7c3aed",
  traps: "#9333ea",
  trapezius: "#9333ea",
  lats: "#2563eb",
  back: "#1d4ed8",
  "upper back": "#1e40af",
  "lower back": "#1e3a8a",
  "middle back": "#2563eb",
  biceps: "#ea580c",
  triceps: "#ca8a04",
  forearms: "#65a30d",
  quadriceps: "#059669",
  quads: "#059669",
  hamstrings: "#0d9488",
  glutes: "#db2777",
  calves: "#4f46e5",
  abdominals: "#0891b2",
  abs: "#0891b2",
  obliques: "#c026d3",
  neck: "#64748b",
  abductors: "#0f766e",
  adductors: "#115e59",
  cardio: "#475569",
  full: "#334155",
  other: "#64748b",
};

export const FALLBACK_MUSCLE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];


export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;


export interface SplitSet {
  id: string;
  set_number: number;
  weight: number;
  reps?: number;
  rep_range_min?: number;
  rep_range_max?: number;
  rep_type: "reps" | "repRange";
  type: "Warm Up" | "Normal" | "Failure" | "Drop";
}

export interface SplitExercise {
  id: string;
  exercise_id: string;
  name: string;
  notes: string;
  rest_timer: string;
  position: number;
  sets: SplitSet[];
}

export interface SplitDay {
  id: string;
  day_number: number;
  name: string;
  weekday: string;
  position: number;
  exercises: SplitExercise[];
}

export interface Split {
  id: string;
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  is_active: boolean; 
  created_at: string;
  updated_at: string;
  days: SplitDay[];
}
