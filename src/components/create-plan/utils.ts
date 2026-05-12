import type { Exercise } from "@/lib/types";
import {
  FALLBACK_MUSCLE_COLORS,
  MUSCLE_COLOR_MAP,
} from "@/lib/utils";
import type { Day, MuscleMixEntry, PlanExercise, PlanSet } from "./types";

function hashToIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h) % mod;
}

function normalizeMuscleLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Other";
  return trimmed
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Color for a display muscle label; same label -> same color everywhere.
 */
export function getColorForMuscle(displayMuscle: string): string {
  const key = displayMuscle.trim().toLowerCase();
  if (MUSCLE_COLOR_MAP[key]) return MUSCLE_COLOR_MAP[key];
  for (const [mk, color] of Object.entries(MUSCLE_COLOR_MAP)) {
    if (key.includes(mk) || mk.includes(key)) return color;
  }
  return FALLBACK_MUSCLE_COLORS[
    hashToIndex(key, FALLBACK_MUSCLE_COLORS.length)
  ];
}

export function getExercisePrimaryMuscleKeys(exercise: Exercise): string[] {
  const raw = exercise.jsonContents?.[0]?.content?.primaryMuscles as
    | string[]
    | undefined;
  return (raw?.length ? raw : ["Other"]).map(normalizeMuscleLabel);
}

export function computeMuscleMix(
  planExercises: PlanExercise[],
): MuscleMixEntry[] {
  const tally = new Map<string, number>();
  for (const pe of planExercises) {
    const keys = getExercisePrimaryMuscleKeys(pe.exercise);
    const share = 1 / keys.length;
    for (const k of keys) {
      tally.set(k, (tally.get(k) ?? 0) + share);
    }
  }
  const total = Array.from(tally.values()).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const entries = Array.from(tally.entries()).map(([muscle, w]) => ({
    muscle,
    weight: w,
    color: getColorForMuscle(muscle),
  }));

  const rawPercents = entries.map((e) => (e.weight / total) * 100);
  const floors = rawPercents.map((p) => Math.floor(p));
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = rawPercents
    .map((p, i) => ({ i, f: p - Math.floor(p) }))
    .sort((a, b) => b.f - a.f);
  const rounded = [...floors];
  for (let k = 0; k < remainder; k++) {
    rounded[order[k % order.length].i]++;
  }

  return entries
    .map((e, i) => ({
      muscle: e.muscle,
      color: e.color,
      percent: rounded[i],
    }))
    .filter((e) => e.percent > 0)
    .sort((a, b) => b.percent - a.percent);
}

const EST_WORK_SECONDS_PER_SET = 45;
const EST_EXERCISE_CHANGE_SECONDS = 45;

function parseRestTimerSeconds(rest: string): number {
  if (!rest || rest === "off") return 0;
  const s = parseInt(rest, 10);
  return Number.isFinite(s) ? s : 0;
}

function effectiveRepsForVolume(set: PlanSet): number {
  if (set.repType === "reps") return Math.max(0, Number(set.reps) || 0);
  const lo = Number(set.repRangeMin) || 0;
  const hi = Number(set.repRangeMax) || lo;
  return Math.max(0, (lo + hi) / 2);
}

function estimateDayDurationSeconds(day: Day): number {
  let sec = 0;
  const { exercises } = day;
  for (let e = 0; e < exercises.length; e++) {
    const pe = exercises[e];
    const { sets } = pe;
    for (let i = 0; i < sets.length; i++) {
      sec += EST_WORK_SECONDS_PER_SET;
      if (i < sets.length - 1) {
        sec += parseRestTimerSeconds(pe.restTimer);
      }
    }
    if (e < exercises.length - 1) {
      sec += EST_EXERCISE_CHANGE_SECONDS;
    }
  }
  return sec;
}

export function computeSplitStats(days: Day[]): {
  totalVolumeKg: number;
  totalEstSeconds: number;
} {
  let totalVolumeKg = 0;
  let totalEstSeconds = 0;
  for (const day of days) {
    totalEstSeconds += estimateDayDurationSeconds(day);
    for (const pe of day.exercises) {
      for (const s of pe.sets) {
        totalVolumeKg += Number(s.weight) * effectiveRepsForVolume(s);
      }
    }
  }
  return { totalVolumeKg, totalEstSeconds };
}

export function formatEstDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

export function formatVolumeKg(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })}k`;
  }
  return Math.round(value).toLocaleString();
}

export const createDefaultSet = (): PlanSet => ({
  weight: 0,
  repType: "reps",
  reps: 10,
  type: "Normal",
});

export const getSetValuesByRepType = (
  repType: "reps" | "repRange",
  set?: PlanSet,
) =>
  repType === "reps"
    ? {
        reps: set?.reps ?? 10,
        repRangeMin: undefined,
        repRangeMax: undefined,
      }
    : {
        reps: undefined,
        repRangeMin: set?.repRangeMin ?? 8,
        repRangeMax: set?.repRangeMax ?? 12,
      };
