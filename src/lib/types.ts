import type { Split } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export interface Set {
  id: string;
  set_number: number;
  weight: number;
  reps?: number;
  rep_range_min?: number;
  rep_range_max?: number;
  checked?: boolean;
  type?: "Warm Up" | "Normal" | "Failure" | "Drop";
}

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  name: string;
  notes: string;
  rest_timer: string;
  position: number;
  sets: Set[];
  exercise_image?: string;
  order_index?: string;
}

export interface Workout {
  id: string;
  name: string;
  created_at: string;
  exercises: WorkoutExercise[];
  workout_exercises: WorkoutExercise[];
}

export interface ActiveWorkout {
  id?: string;
  workoutId?: string | null;
  name: string;
  startedAt: Date;
  created_at: Date;
  exercises: WorkoutExercise[];
  isCustom: boolean;
}

export interface ExerciseJsonContent {
  [key: string]: any;
}

export interface Exercise {
  folder: string;
  images: string[];
  jsonContents: ExerciseJsonContent[];
}

export interface Set {
  weight: number;
  repType: "reps" | "repRange";
  reps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  type?: "Warm Up" | "Normal" | "Failure" | "Drop";
}

export interface WorkoutExercise {
  exercise: Exercise;
  notes: string;
  restTimer: string;
  sets: Set[];
}


export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "text-green-600";
    case "Intermediate":
      return "text-blue-600";
    case "Advanced":
      return "text-orange-600";
    case "Expert":
      return "textbg-red-600";
    default:
      return "text-gray-600";
  }
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getTotalExercises = (split: Split) => {
  return split.days.reduce((total, day) => total + day.exercises.length, 0);
};

export const getTotalSets = (split: Split) => {
  return split.days.reduce(
    (total, day) =>
      total + day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    0,
  );
};