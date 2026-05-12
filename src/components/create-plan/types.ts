import type { Exercise } from "@/lib/types";
import type { Split, WEEKDAYS } from "@/lib/utils";

export interface CreatePlanProps {
  closeModal: () => void;
  existingSplitId?: string;
  existingSplitData?: Split | null;
}

export type Day = {
  id: string;
  name: string;
  /** Day of week for scheduling this split day */
  weekday: (typeof WEEKDAYS)[number] | "";
  exercises: PlanExercise[];
};

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export type PlanSet = {
  weight: number;
  repType: "reps" | "repRange";
  reps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  type: "Warm Up" | "Normal" | "Failure" | "Drop";
};

export type PlanExercise = {
  id: string;
  exercise: Exercise;
  notes: string;
  restTimer: string;
  sets: PlanSet[];
};

export type MuscleMixEntry = {
  muscle: string;
  percent: number;
  color: string;
};

