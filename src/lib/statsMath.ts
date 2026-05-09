export type StatWorkoutSet = {
  weight: number | null;
  reps: number | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  checked?: boolean | null;
  type?: string | null;
};

export const toStatNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const roundTo = (value: number, places = 0) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const isCompletedSet = (set: StatWorkoutSet) => set.checked === true;

export const effectiveReps = (set: StatWorkoutSet) => {
  if (set.reps !== null && set.reps !== undefined) {
    return Math.max(0, toStatNumber(set.reps));
  }

  const min = toStatNumber(set.rep_range_min);
  const max =
    set.rep_range_max !== null && set.rep_range_max !== undefined
      ? toStatNumber(set.rep_range_max)
      : min;

  return Math.max(0, (min + max) / 2);
};

export const setVolume = (set: StatWorkoutSet) =>
  toStatNumber(set.weight) * effectiveReps(set);

export const getRangeStart = (timeRange: string, now = new Date()) => {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (timeRange === "1month") startDate.setMonth(now.getMonth() - 1);
  else if (timeRange === "3months") startDate.setMonth(now.getMonth() - 3);
  else if (timeRange === "6months") startDate.setMonth(now.getMonth() - 6);
  else if (timeRange === "1year") startDate.setFullYear(now.getFullYear() - 1);
  else startDate.setMonth(now.getMonth() - 3);

  return startDate;
};

export const startOfWeek = (date: Date) => {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
};

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const getWeekStarts = (startDate: Date, endDate: Date) => {
  const weeks: Date[] = [];
  const cursor = startOfWeek(startDate);
  const last = startOfWeek(endDate);

  while (cursor <= last) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
};

const MUSCLE_GROUPS = [
  { group: "Back", muscles: ["lats", "middle back", "lower back"] },
  { group: "Chest", muscles: ["chest"] },
  {
    group: "Legs",
    muscles: ["quadriceps", "hamstrings", "glutes", "calves", "adductors"],
  },
  { group: "Core", muscles: ["abdominals"] },
  { group: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { group: "Shoulders", muscles: ["shoulders", "traps"] },
];

type ExerciseLibraryItem = {
  jsonContents?: Array<{
    content?: {
      name?: string;
      primaryMuscles?: string[];
    };
  }>;
};

export const getBroadMuscleGroups = (
  exerciseName: string,
  exerciseLibrary: ExerciseLibraryItem[],
) => {
  const searchName = exerciseName?.toLowerCase().trim();

  const exercise = exerciseLibrary.find((ex) => {
    const libraryName = ex.jsonContents?.[0]?.content?.name;
    return libraryName?.toLowerCase().trim() === searchName;
  });

  const primaryMuscles = exercise?.jsonContents?.[0]?.content?.primaryMuscles;
  if (!Array.isArray(primaryMuscles)) return [];

  const muscles = primaryMuscles.map((m: string) => m.toLowerCase().trim());
  const groups = new Set<string>();

  MUSCLE_GROUPS.forEach(({ group, muscles: groupMuscles }) => {
    if (groupMuscles.some((muscle) => muscles.includes(muscle))) {
      groups.add(group);
    }
  });

  return Array.from(groups);
};
