/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import type { Exercise } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";

import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import supabase from "@/lib/supabase";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Dumbbell, GripVertical, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import {
  FALLBACK_MUSCLE_COLORS,
  MUSCLE_COLOR_MAP,
  WEEKDAYS,
  type Split,
} from "@/lib/utils";

interface CreatePlanProps {
  closeModal: () => void;
  existingSplitId?: string;
  existingSplitData?: Split | null;
}

type Day = {
  id: string;
  name: string;
  /** Day of week for scheduling this split day */
  weekday: (typeof WEEKDAYS)[number] | "";
  exercises: PlanExercise[];
};

type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

type PlanSet = {
  weight: number;
  repType: "reps" | "repRange";
  reps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  type: "Warm Up" | "Normal" | "Failure" | "Drop";
};

type PlanExercise = {
  id: string;
  exercise: Exercise;
  notes: string;
  restTimer: string;
  sets: PlanSet[];
};

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
 * Color for a display muscle label; same label → same color everywhere.
 */
function getColorForMuscle(displayMuscle: string): string {
  const key = displayMuscle.trim().toLowerCase();
  if (MUSCLE_COLOR_MAP[key]) return MUSCLE_COLOR_MAP[key];
  for (const [mk, color] of Object.entries(MUSCLE_COLOR_MAP)) {
    if (key.includes(mk) || mk.includes(key)) return color;
  }
  return FALLBACK_MUSCLE_COLORS[
    hashToIndex(key, FALLBACK_MUSCLE_COLORS.length)
  ];
}

function getExercisePrimaryMuscleKeys(exercise: Exercise): string[] {
  const raw = exercise.jsonContents?.[0]?.content?.primaryMuscles as
    | string[]
    | undefined;
  return (raw?.length ? raw : ["Other"]).map(normalizeMuscleLabel);
}

type MuscleMixEntry = { muscle: string; percent: number; color: string };

function computeMuscleMix(planExercises: PlanExercise[]): MuscleMixEntry[] {
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

/** Rough work time per set (setup + execution), seconds */
const EST_WORK_SECONDS_PER_SET = 45;
/** Buffer between exercises on the same day, seconds */
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

/** One session for this day: work + rests between sets + changeovers between exercises */
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

function computeSplitStats(days: Day[]): {
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

function formatEstDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

function formatVolumeKg(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })}k`;
  }
  return Math.round(value).toLocaleString();
}

const createDefaultSet = (): PlanSet => ({
  weight: 0,
  repType: "reps",
  reps: 10,
  type: "Normal",
});

const getSetValuesByRepType = (repType: "reps" | "repRange", set?: PlanSet) =>
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

function SortableDayCard({
  day,
  index,
  isActive,
  onSelect,
  onWeekdayChange,
}: {
  day: Day;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onWeekdayChange: (value: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer ${
        isActive
          ? "bg-orange-600 text-white"
          : "bg-gray-100 dark:bg-neutral-800"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          className="cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          onClick={(e) => e.stopPropagation()}
          aria-label="Reorder day"
        >
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{`Day ${index + 1}`}</p>
          <div
            className="mt-2"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={day.weekday || "none"}
              onValueChange={onWeekdayChange}
            >
              <SelectTrigger
                className={`h-8 text-xs w-full ${
                  isActive
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white dark:bg-neutral-700"
                }`}
              >
                <SelectValue placeholder="Day of week" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Day of week</SelectLabel>
                  <SelectItem value="none">Not set</SelectItem>
                  {WEEKDAYS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

const CreatePlan = ({
  closeModal,
  existingSplitId,
  existingSplitData,
}: CreatePlanProps) => {
  const [splitName, setSplitName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Intermediate");
  const [isActive, setIsActive] = useState(false);

  const [days, setDays] = useState<Day[]>([
    { id: "day-1", name: "Day 1", weekday: "", exercises: [] },
  ]);

  const [activeDayId, setActiveDayId] = useState("day-1");
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileLibrary, setShowMobileLibrary] = useState(false);
  const mobileStackRef = useRef<HTMLDivElement | null>(null);
  const mobileDragStateRef = useRef<{
    startY: number;
    startRatio: number;
  } | null>(null);
  const [mobilePaneRatio, setMobilePaneRatio] = useState(0.4);

  const muscleMix = useMemo(
    () => computeMuscleMix(days.flatMap((d) => d.exercises)),
    [days],
  );

  const splitStats = useMemo(() => computeSplitStats(days), [days]);

  const createPlanExercise = (exercise: Exercise): PlanExercise => ({
    id: exercise.folder,
    exercise,
    notes: "",
    restTimer: "off",
    sets: [createDefaultSet()],
  });

  // 📦 fetch
  useEffect(() => {
    getFoldersAndContents().then(({ exercises }) => setExercises(exercises));
  }, []);

  useEffect(() => {
    if (existingSplitData) {
      setSplitName(existingSplitData.name);
      setDifficulty(existingSplitData.difficulty);
      setIsActive(existingSplitData.is_active || false);
      // Transform the split days back to your component's Day format
      const transformedDays = existingSplitData.days.map((day, idx) => ({
        id: `day-${idx + 1}`,
        name: day.name || `Day ${idx + 1}`,
        weekday: (day.weekday as any) || "",
        exercises: day.exercises.map((ex) => ({
          id: ex.exercise_id,
          exercise: {
            folder: ex.exercise_id,
            jsonContents: [{ content: { name: ex.name } }],
            images: [],
          } as Exercise,
          notes: ex.notes || "",
          restTimer: ex.rest_timer || "off",
          sets: ex.sets.map((set) => ({
            weight: set.weight,
            repType: set.rep_type,
            reps: set.reps,
            repRangeMin: set.rep_range_min,
            repRangeMax: set.rep_range_max,
            type: set.type,
          })),
        })),
      }));

      setDays(transformedDays);
    }
  }, [existingSplitData]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      const mobile = mq.matches;
      setIsMobileView(mobile);
      if (!mobile) setShowMobileLibrary(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const filteredExercises = exercises.filter((e) =>
    e.jsonContents?.[0]?.content?.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  // ➕ ADD DAY
  const addDay = () => {
    const newDay: Day = {
      id: `day-${days.length + 1}`,
      name: `Day ${days.length + 1}`,
      weekday: "",
      exercises: [],
    };

    setDays((prev) => [...prev, newDay]);
  };

  // ➕ ADD EXERCISE (BUTTON)
  const addExerciseToActiveDay = (exercise: Exercise) => {
    // Check if exercise already exists in the active day
    const alreadyExists = days
      .find((d) => d.id === activeDayId)
      ?.exercises.some((e) => e.id === exercise.folder);

    if (alreadyExists) {
      toast.error("Exercise already added to this day");
      return;
    }

    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: [...day.exercises, createPlanExercise(exercise)],
            }
          : day,
      ),
    );
  };

  const addExerciseFromLibrary = (exercise: Exercise) => {
    addExerciseToActiveDay(exercise);
    if (isMobileView) setShowMobileLibrary(false);
  };

  const beginMobileResize = (
    event: React.PointerEvent<HTMLDivElement>,
  ): void => {
    if (!isMobileView) return;
    const container = mobileStackRef.current;
    if (!container) return;

    event.preventDefault();

    const startY = event.clientY;
    const startRatio = mobilePaneRatio;
    mobileDragStateRef.current = { startY, startRatio };

    const handleMove = (e: PointerEvent) => {
      const state = mobileDragStateRef.current;
      if (!state || !container) return;
      const height = container.clientHeight || 1;
      const deltaY = e.clientY - state.startY;
      const nextRatio = Math.min(
        0.8,
        Math.max(0.2, state.startRatio + deltaY / height),
      );
      setMobilePaneRatio(nextRatio);
    };

    const handleUp = () => {
      mobileDragStateRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  const addSetToExercise = (exerciseId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.map((item) => {
                if (item.id !== exerciseId) return item;

                const lastSet = item.sets[item.sets.length - 1];

                const newSet: PlanSet = lastSet
                  ? { ...lastSet } // ✅ duplicate previous set
                  : createDefaultSet(); // fallback (just in case)

                // ensure type always exists
                if (!newSet.type) newSet.type = "Normal";

                return {
                  ...item,
                  sets: [...item.sets, newSet],
                };
              }),
            }
          : day,
      ),
    );
  };

  const removeSetFromExercise = (exerciseId: string, setIndex: number) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.map((item) =>
                item.id === exerciseId
                  ? {
                      ...item,
                      sets:
                        item.sets.length === 1
                          ? item.sets
                          : item.sets.filter((_, index) => index !== setIndex),
                    }
                  : item,
              ),
            }
          : day,
      ),
    );
  };

  const updateExerciseSet = (
    exerciseId: string,
    setIndex: number,
    updates: Partial<PlanSet>,
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.map((item) =>
                item.id === exerciseId
                  ? {
                      ...item,
                      sets: item.sets.map((set, index) =>
                        index === setIndex ? { ...set, ...updates } : set,
                      ),
                    }
                  : item,
              ),
            }
          : day,
      ),
    );
  };

  const updateExerciseRepType = (
    exerciseId: string,
    repType: "reps" | "repRange",
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.map((item) =>
                item.id === exerciseId
                  ? {
                      ...item,
                      sets: item.sets.map((set) => ({
                        ...set,
                        repType,
                        ...getSetValuesByRepType(repType, set),
                      })),
                    }
                  : item,
              ),
            }
          : day,
      ),
    );
  };

  const removeExerciseFromActiveDay = (exerciseId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.filter((item) => item.id !== exerciseId),
            }
          : day,
      ),
    );
  };

  const updateExerciseDetails = (
    exerciseId: string,
    updates: Partial<Pick<PlanExercise, "notes" | "restTimer">>,
  ) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              exercises: day.exercises.map((item) =>
                item.id === exerciseId ? { ...item, ...updates } : item,
              ),
            }
          : day,
      ),
    );
  };

  // // 💾 SAVE
  // const handleSave = () => {
  //   const payload = {
  //     name: splitName,
  //     days,
  //   };

  //   console.log("SPLIT SAVE:", payload);
  // };

  // Enhanced version with update support
  const handleSave = async () => {
    if (!splitName.trim()) {
      toast.error("Please enter a split name");
      return;
    }

    if (days.length === 0) {
      toast.error("Please add at least one day to your split");
      return;
    }

    const hasExercises = days.some((day) => day.exercises.length > 0);
    if (!hasExercises) {
      toast.error("Please add at least one exercise to your split");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to save a split");
        return;
      }

      // Check if we're editing an existing split (you'll need to pass splitId as prop)
      const isEditing = !!existingSplitId; // Add this as a prop to your component

      if (isEditing) {
        // UPDATE EXISTING SPLIT

        // 1. Update split metadata
        const { error: splitError } = await supabase
          .from("splits")
          .update({
            name: splitName,
            difficulty: difficulty,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSplitId)
          .eq("user_id", user.id);

        if (splitError) throw splitError;
        if (isActive) {
          const { error: deactivateError } = await supabase
            .from("splits")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .neq("id", existingSplitId);

          if (deactivateError) throw deactivateError;
        }

        // 2. Delete existing days, exercises, and sets (cascade will handle related tables)
        const { error: deleteError } = await supabase
          .from("split_days")
          .delete()
          .eq("split_id", existingSplitId);

        if (deleteError) throw deleteError;

        // 3. Re-insert everything with the new data
        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
          const day = days[dayIndex];

          const { data: splitDay, error: dayError } = await supabase
            .from("split_days")
            .insert({
              split_id: existingSplitId,
              user_id: user.id,
              day_number: dayIndex + 1,
              name: day.name,
              weekday: day.weekday || null,
              position: dayIndex,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          for (
            let exerciseIndex = 0;
            exerciseIndex < day.exercises.length;
            exerciseIndex++
          ) {
            const exercise = day.exercises[exerciseIndex];

            const { data: splitDayExercise, error: exerciseError } =
              await supabase
                .from("split_day_exercises")
                .insert({
                  split_day_id: splitDay.id,
                  user_id: user.id,
                  exercise_id: exercise.exercise.folder,
                  name:
                    exercise.exercise.jsonContents?.[0]?.content?.name ||
                    exercise.exercise.folder,
                  notes: exercise.notes || null,
                  rest_timer:
                    exercise.restTimer === "off" ? null : exercise.restTimer,
                  position: exerciseIndex,
                })
                .select()
                .single();

            if (exerciseError) throw exerciseError;

            for (
              let setIndex = 0;
              setIndex < exercise.sets.length;
              setIndex++
            ) {
              const set = exercise.sets[setIndex];

              const { error: setError } = await supabase
                .from("split_exercise_sets")
                .insert({
                  split_day_exercise_id: splitDayExercise.id,
                  user_id: user.id,
                  set_number: setIndex + 1,
                  weight: set.weight || 0,
                  rep_type: set.repType,
                  reps: set.repType === "reps" ? set.reps || 0 : null,
                  rep_range_min:
                    set.repType === "repRange" ? set.repRangeMin || 0 : null,
                  rep_range_max:
                    set.repType === "repRange" ? set.repRangeMax || 0 : null,
                  type: set.type,
                });

              if (setError) throw setError;
            }
          }
        }

        toast.success("Split updated successfully!");
      } else {
        // CREATE NEW SPLIT (original code)
        const { data: split, error: splitError } = await supabase
          .from("splits")
          .insert({
            user_id: user.id,
            name: splitName,
            difficulty: difficulty,
            is_active: isActive,
          })
          .select()
          .single();

        if (splitError) throw splitError;

        if (isActive) {
          const { error: deactivateError } = await supabase
            .from("splits")
            .update({ is_active: false })
            .eq("user_id", user.id)
            .neq("id", split.id);

          if (deactivateError) throw deactivateError;
        }

        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
          const day = days[dayIndex];

          const { data: splitDay, error: dayError } = await supabase
            .from("split_days")
            .insert({
              split_id: split.id,
              user_id: user.id,
              day_number: dayIndex + 1,
              name: day.name,
              weekday: day.weekday || null,
              position: dayIndex,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          for (
            let exerciseIndex = 0;
            exerciseIndex < day.exercises.length;
            exerciseIndex++
          ) {
            const exercise = day.exercises[exerciseIndex];

            const { data: splitDayExercise, error: exerciseError } =
              await supabase
                .from("split_day_exercises")
                .insert({
                  split_day_id: splitDay.id,
                  user_id: user.id,
                  exercise_id: exercise.exercise.folder,
                  name:
                    exercise.exercise.jsonContents?.[0]?.content?.name ||
                    exercise.exercise.folder,
                  notes: exercise.notes || null,
                  rest_timer:
                    exercise.restTimer === "off" ? null : exercise.restTimer,
                  position: exerciseIndex,
                })
                .select()
                .single();

            if (exerciseError) throw exerciseError;

            for (
              let setIndex = 0;
              setIndex < exercise.sets.length;
              setIndex++
            ) {
              const set = exercise.sets[setIndex];

              const { error: setError } = await supabase
                .from("split_exercise_sets")
                .insert({
                  split_day_exercise_id: splitDayExercise.id,
                  user_id: user.id,
                  set_number: setIndex + 1,
                  weight: set.weight || 0,
                  rep_type: set.repType,
                  reps: set.repType === "reps" ? set.reps || 0 : null,
                  rep_range_min:
                    set.repType === "repRange" ? set.repRangeMin || 0 : null,
                  rep_range_max:
                    set.repType === "repRange" ? set.repRangeMax || 0 : null,
                  type: set.type,
                });

              if (setError) throw setError;
            }
          }
        }

        toast.success("Split saved successfully!");
      }

      closeModal();
    } catch (error) {
      console.error("Error saving split:", error);
      toast.error("Failed to save split. Please try again.");
    }
  };

  // 🔥 DRAG
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id.toString();

    const splitDayRow = days.find((d) => d.id === activeId);
    if (splitDayRow) {
      const idx = days.findIndex((d) => d.id === activeId);
      setActiveDragLabel(
        splitDayRow.weekday || splitDayRow.name || `Day ${idx + 1}`,
      );
      return;
    }

    const isLibraryDrag = activeId.startsWith("library-");
    const normalizedId = isLibraryDrag
      ? activeId.replace("library-", "")
      : activeId;
    const fromLibrary = exercises.find((e) => e.folder === normalizedId);
    const fromDay = days
      .flatMap((day) => day.exercises)
      .find((item) => item.id === normalizedId);

    const dragName =
      fromLibrary?.jsonContents?.[0]?.content?.name ||
      fromDay?.exercise.jsonContents?.[0]?.content?.name ||
      activeId;

    setActiveDragLabel(dragName);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragLabel(null);
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    if (activeId === overId) return;

    const isLibraryDrag = activeId.startsWith("library-");
    const draggedFolderId = isLibraryDrag
      ? activeId.replace("library-", "")
      : activeId;

    const draggedExercise = exercises.find((e) => e.folder === draggedFolderId);

    const oldDayIndex = days.findIndex((d) => d.id === activeId);
    const newDayIndex = days.findIndex((d) => d.id === overId);
    if (oldDayIndex !== -1 && newDayIndex !== -1) {
      setDays((prev) => arrayMove(prev, oldDayIndex, newDayIndex));
      return;
    }

    // from list → active day
    if (isLibraryDrag && draggedExercise) {
      setDays((prev) =>
        prev.map((day) =>
          day.id === activeDayId
            ? {
                ...day,
                exercises: [
                  ...day.exercises,
                  createPlanExercise(draggedExercise),
                ],
              }
            : day,
        ),
      );
      return;
    }

    // reorder inside day
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== activeDayId) return day;

        const oldIndex = day.exercises.findIndex(
          (e) => e.id === draggedFolderId,
        );
        const newIndex = day.exercises.findIndex((e) => e.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            ...day,
            exercises: arrayMove(day.exercises, oldIndex, newIndex),
          };
        }

        return day;
      }),
    );
  };

  const activeDay = days.find((d) => d.id === activeDayId);

  const exerciseLibraryRows = filteredExercises.map((exercise) => (
    <div
      key={exercise.folder}
      className="flex items-center justify-between p-2 rounded-lg"
    >
      <DraggableExercise
        id={`library-${exercise.folder}`}
        name={exercise.jsonContents?.[0]?.content?.name}
        image={exercise.images[0]}
        accentColor={getColorForMuscle(
          getExercisePrimaryMuscleKeys(exercise)[0],
        )}
        pmuscle={
          exercise.jsonContents?.[0]?.content.primaryMuscles?.join(", ") ||
          "N/A"
        }
      />

      <Button
        onClick={() => addExerciseFromLibrary(exercise)}
        className="ml-2 shrink-0 text-xs bg-orange-600 text-white hover:bg-orange-700"
      >
        +
      </Button>
    </div>
  ));

  return (
    <>
      <motion.div
        onClick={closeModal}
        className="fixed inset-0 bg-black/20 z-50"
      />

      <motion.div className="fixed inset-0 z-100 p-4">
        <div className="bg-white dark:bg-[#2d2d2d] h-full rounded-2xl p-4 flex flex-col">
          {/* 🔝 HEADER */}
          <div className="flex flex-col gap-3 mb-4 bg-accent rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <div className="lg:min-w-[200px] flex-1">
                <Input
                  placeholder="Split name..."
                  className="w-full max-w-md"
                  value={splitName}
                  onChange={(e) => setSplitName(e.target.value)}
                />
              </div>

              {/* Add this after the difficulty select */}
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Set as active split
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Only one split can be active at a time
                </p>
              </div>

              <Button onClick={addDay}>+ Day</Button>

              <Button onClick={handleSave}>Save</Button>
              <Button onClick={closeModal}> Cancel</Button>
            </div>

            {muscleMix.length > 0 && (
              <div className="flex w-full flex-wrap gap-x-8 gap-y-3 border-b border-border/60 pb-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Est. time
                  </p>
                  <p className="text-lg font-semibold tabular-nums tracking-tight">
                    {formatEstDuration(splitStats.totalEstSeconds)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Sum of all days (work + rests + changeovers)
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total volume
                  </p>
                  <p className="text-lg font-semibold tabular-nums tracking-tight">
                    {formatVolumeKg(splitStats.totalVolumeKg)}
                    <span className="text-sm font-medium text-muted-foreground">
                      {" "}
                      kg·reps
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Σ (weight × reps) across every set
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Difficulty
                  </p>
                  <Select
                    value={difficulty}
                    onValueChange={(value: Difficulty) => setDifficulty(value)}
                  >
                    <SelectTrigger className="w-[140px] bg-white dark:bg-neutral-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Training Difficulty</SelectLabel>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Overall program intensity
                  </p>
                </div>
              </div>
            )}

            {muscleMix.length > 0 ? (
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Muscle focus (all days)
                </p>
                <div
                  className="flex h-3 w-full gap-2 overflow-hidden rounded-full"
                  role="img"
                  aria-label="Muscle group distribution for this split"
                >
                  {muscleMix.map((m) => (
                    <div
                      key={m.muscle}
                      className="h-full min-w-0 transition-[width] duration-300 rounded-2xl"
                      style={{
                        width: `${m.percent}%`,
                        backgroundColor: m.color,
                      }}
                      title={`${m.muscle}: ${m.percent}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                  {muscleMix.map((m) => (
                    <span
                      key={m.muscle}
                      className="inline-flex items-center gap-1.5 capitalize"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full "
                        style={{ backgroundColor: m.color }}
                        aria-hidden
                      />
                      <span className="font-medium">{m.muscle}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.percent}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add exercises to see muscle balance across your split.
              </p>
            )}
          </div>

          <div
            className="lg:hidden flex items-center justify-center py-1 my-1"
            onPointerDown={beginMobileResize}
          >
            <div className="h-1 w-16 rounded-full bg-border/70" />
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              ref={mobileStackRef}
              className="lg:grid flex flex-col gap-4 flex-1 min-h-0 overflow-hidden md:grid-cols-[1fr_3fr_1fr]"
            >
              {/* 📅 DAYS LIST */}
              <SortableContext
                items={days.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="space-y-2 overflow-y-auto lg:h-full h-fit"
                  style={
                    isMobileView
                      ? {
                          flexBasis: `${mobilePaneRatio * 100}%`,
                          minHeight: 0,
                        }
                      : undefined
                  }
                >
                  {days.map((day, index) => (
                    <SortableDayCard
                      key={day.id}
                      day={day}
                      index={index}
                      isActive={activeDayId === day.id}
                      onSelect={() => setActiveDayId(day.id)}
                      onWeekdayChange={(value) =>
                        setDays((prev) =>
                          prev.map((d) =>
                            d.id === day.id
                              ? {
                                  ...d,
                                  weekday:
                                    value === "none"
                                      ? ""
                                      : (value as Day["weekday"]),
                                }
                              : d,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </SortableContext>

              <div
                className="lg:hidden flex items-center justify-center py-1 my-1"
                onPointerDown={beginMobileResize}
              >
                <div className="h-1 w-16 rounded-full bg-border/70" />
              </div>

              {/* 🏋️ ACTIVE DAY BUILDER */}
              <div
                className="lg:rounded-xl lg:p-3 p-0 overflow-y-auto min-h-0 flex flex-col"
                style={
                  isMobileView
                    ? {
                        flexBasis: `${(1 - mobilePaneRatio) * 100}%`,
                        minHeight: 0,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {`Day ${days.findIndex((d) => d.id === activeDayId) + 1}`}
                  </p>
                  <Select
                    value={activeDay?.weekday || "none"}
                    onValueChange={(value) =>
                      setDays((prev) =>
                        prev.map((d) =>
                          d.id === activeDayId
                            ? {
                                ...d,
                                weekday:
                                  value === "none"
                                    ? ""
                                    : (value as Day["weekday"]),
                              }
                            : d,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-[160px] bg-white dark:bg-neutral-700">
                      <SelectValue placeholder="Day of week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Day of week</SelectLabel>
                        <SelectItem value="none">Not set</SelectItem>
                        {WEEKDAYS.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    value={activeDay?.name || ""}
                    onChange={(e) =>
                      setDays((prev) =>
                        prev.map((d) =>
                          d.id === activeDayId
                            ? { ...d, name: e.target.value }
                            : d,
                        ),
                      )
                    }
                    placeholder="Day name..."
                    className="bg-white dark:bg-neutral-700 w-fit min-w-[140px]"
                  />
                </div>

                <SortableContext
                  items={activeDay?.exercises.map((e) => e.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  {activeDay?.exercises.map((exerciseItem) => (
                    <SortableItem
                      key={exerciseItem.id}
                      item={exerciseItem}
                      addSet={addSetToExercise}
                      removeSet={removeSetFromExercise}
                      updateSet={updateExerciseSet}
                      removeExercise={removeExerciseFromActiveDay}
                      updateDetails={updateExerciseDetails}
                      updateRepType={updateExerciseRepType}
                    />
                  ))}
                </SortableContext>

                <Button
                  type="button"
                  className="mb-3 w-full sticky bottom-0 bg-orange-600 text-white hover:bg-orange-700 md:hidden"
                  onClick={() => setShowMobileLibrary(true)}
                >
                  Add exercises
                </Button>
              </div>

              {/* 🔎 EXERCISES (desktop) */}
              <div className="hidden md:flex flex-col h-full min-h-0 bg-accent rounded-2xl p-4">
                <Input
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="flex-1 overflow-y-auto min-h-0 mt-4 space-y-2">
                  {exerciseLibraryRows}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isMobileView && showMobileLibrary ? (
                <>
                  <motion.button
                    type="button"
                    key="mobile-lib-backdrop"
                    aria-label="Close exercise library"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-55 bg-black/40"
                    onClick={() => setShowMobileLibrary(false)}
                  />
                  <motion.div
                    key="mobile-lib-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-exercise-library-title"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 32, stiffness: 360 }}
                    className="fixed inset-x-0 bottom-0 z-56 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl bg-accent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-[#2d2d2d] md:hidden"
                  >
                    <div className="mb-3 flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setShowMobileLibrary(false)}
                        aria-label="Close"
                      >
                        <ArrowLeft size={20} />
                      </Button>
                      <h2
                        id="mobile-exercise-library-title"
                        className="text-base font-semibold tracking-tight"
                      >
                        Exercise library
                      </h2>
                    </div>
                    <Input
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="shrink-0"
                    />
                    <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
                      {exerciseLibraryRows}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>

            <DragOverlay>
              {activeDragLabel ? (
                <div className="bg-white dark:bg-neutral-700 p-2 rounded-lg text-sm shadow-lg border border-gray-200 dark:border-neutral-600">
                  {activeDragLabel}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </motion.div>
    </>
  );
};

export default CreatePlan;

//
// 🔹 SORTABLE ITEM
//
const SortableItem = ({
  item,
  addSet,
  removeSet,
  updateSet,
  removeExercise,
  updateDetails,
  updateRepType,
}: {
  item: PlanExercise;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  updateSet: (
    exerciseId: string,
    setIndex: number,
    updates: Partial<PlanSet>,
  ) => void;
  removeExercise: (exerciseId: string) => void;
  updateDetails: (
    exerciseId: string,
    updates: Partial<Pick<PlanExercise, "notes" | "restTimer">>,
  ) => void;
  updateRepType: (exerciseId: string, repType: "reps" | "repRange") => void;
}) => {
  const id = item.id;
  const name =
    item?.exercise?.jsonContents?.[0]?.content?.name || item.exercise.folder;
  const muscleAccent = getColorForMuscle(
    getExercisePrimaryMuscleKeys(item.exercise)[0],
  );
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="bg-accent p-3 rounded-2xl mb-2 text-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center w-full gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="flex shrink-0 items-center justify-center rounded-xl p-2  ring-black/10 dark:ring-white/15"
              style={{
                color: muscleAccent,
                backgroundColor: `${muscleAccent}26`,
              }}
              aria-hidden
            >
              <Dumbbell size={8} strokeWidth={2} />
            </div>
            <div className="shrink-0">
              {item.exercise.images[0] && (
                <img
                  src={item.exercise.images[0]}
                  alt={item.exercise.folder}
                  className="w-10 h-10 rounded-full object-cover grayscale-100"
                />
              )}
            </div>
            <span className="min-w-0 truncate font-medium">{name}</span>
          </div>
        </div>
        <button onClick={() => removeExercise(item.id)}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="w-full mb-3">
        <h2 className="text-sm font-medium mb-2">Notes</h2>
        <Textarea
          placeholder="Any notes"
          className="min-w-4"
          value={item.notes}
          onChange={(e) => updateDetails(item.id, { notes: e.target.value })}
        />
      </div>

      <div className="w-full mb-3">
        <h2 className="text-sm font-medium mb-2">Rest Timer</h2>
        <Select
          value={item.restTimer}
          onValueChange={(value) =>
            updateDetails(item.id, { restTimer: value })
          }
        >
          <SelectTrigger className="w-fit max-h-fit bg-white dark:bg-neutral-800">
            <SelectValue placeholder="Select a timer" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Rest Timer</SelectLabel>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="30">00:30</SelectItem>
              <SelectItem value="60">01:00</SelectItem>
              <SelectItem value="90">01:30</SelectItem>
              <SelectItem value="120">02:00</SelectItem>
              <SelectItem value="150">02:30</SelectItem>
              <SelectItem value="300">05:00</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-4 px-2 items-center w-full text-xs tracking-tight gap-2">
          <div className="flex items-center">SET</div>

          <div className="flex items-center justify-center">KG</div>
          <div className="flex flex-col items-center justify-center w-full">
            <Select
              value={item.sets[0]?.repType || "reps"}
              onValueChange={(value: "reps" | "repRange") =>
                updateRepType(item.id, value)
              }
            >
              <SelectTrigger
                size="sm"
                className="border-0 w-auto p-1 bg-transparent!"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Rep type</SelectLabel>
                  <SelectItem value="reps">Reps</SelectItem>
                  <SelectItem value="repRange">Rep Range</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-end"></div>
        </div>

        {item.sets.map((set, index) => (
          <div
            key={`${item.id}-set-${index}`}
            className="grid grid-cols-4 gap-2 items-center"
          >
            <Select
              value={set.type || "Normal"}
              onValueChange={(value: PlanSet["type"]) =>
                updateSet(item.id, index, { type: value })
              }
            >
              <SelectTrigger
                size="sm"
                className="border-0 w-auto p-1 ring-0 bg-transparent! relative"
              >
                {/* hide default value */}
                <div className="opacity-0! absolute!">
                  <SelectValue />
                </div>

                {/* custom display */}
                <div className="flex items-center">
                  {set.type === "Warm Up" && (
                    <div className="text-yellow-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      W
                    </div>
                  )}
                  {set.type === "Normal" && (
                    <div className="font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      {index + 1}
                    </div>
                  )}
                  {set.type === "Failure" && (
                    <div className="text-red-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      F
                    </div>
                  )}
                  {set.type === "Drop" && (
                    <div className="text-blue-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      D
                    </div>
                  )}
                </div>
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Set Type</SelectLabel>

                  <SelectItem value="Warm Up">
                    <div className="flex items-center gap-2">
                      <div className="text-yellow-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                        W
                      </div>
                      <p>Warm Up</p>
                    </div>
                  </SelectItem>

                  <SelectItem value="Normal">
                    <div className="flex items-center gap-2">
                      <div className="font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                        {index + 1}
                      </div>
                      <p>Normal</p>
                    </div>
                  </SelectItem>

                  <SelectItem value="Failure">
                    <div className="flex items-center gap-2">
                      <div className="text-red-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                        F
                      </div>
                      <p>Failure</p>
                    </div>
                  </SelectItem>

                  <SelectItem value="Drop">
                    <div className="flex items-center gap-2">
                      <div className="text-blue-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                        D
                      </div>
                      <p>Drop</p>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={set.weight}
              onChange={(e) =>
                updateSet(item.id, index, {
                  weight: Number(e.target.value) || 0,
                })
              }
              placeholder="Kg"
            />
            {set.repType === "reps" ? (
              <Input
                type="number"
                value={set.reps ?? ""}
                onChange={(e) =>
                  updateSet(item.id, index, {
                    reps: Number(e.target.value) || 0,
                  })
                }
                placeholder="Reps"
              />
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={set.repRangeMin ?? ""}
                  onChange={(e) =>
                    updateSet(item.id, index, {
                      repRangeMin: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="Min"
                />
                <Input
                  type="number"
                  value={set.repRangeMax ?? ""}
                  onChange={(e) =>
                    updateSet(item.id, index, {
                      repRangeMax: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="Max"
                />
              </div>
            )}
            <button
              onClick={() => removeSet(item.id, index)}
              className="text-xs px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-800"
            >
              -
            </button>
          </div>
        ))}
      </div>

      <Button onClick={() => addSet(item.id)} className="w-full mt-3">
        Add set
      </Button>
    </div>
  );
};

//
// 🔹 DRAG SOURCE
//
const DraggableExercise = ({
  id,
  name,
  image,
  accentColor,
  pmuscle,
}: {
  id: string;
  name: string;
  image?: string;
  accentColor: string;
  pmuscle: string;
}) => {
  const { attributes, listeners, setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex items-center justify-center w-full"
      >
        {/* <div
          className="lex shrink-0 items-center justify-center rounded-xl p-2  ring-black/10 dark:ring-white/15"
          style={{
            color: accentColor,
            backgroundColor: `${accentColor}26`,
          }}
          aria-hidden
        >
          <Dumbbell size={8} strokeWidth={2} />
        </div> */}

        <div className="shrink-0 ml-2">
          {image && (
            <img
              src={image}
              alt={name}
              className="w-12 h-12 rounded-full object-cover grayscale-100"
            />
          )}
        </div>

        <div className="flex items-center justify-between w-full ml-3">
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium">{name}</h4>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <span
                className="font-medium text-[10px] rounded capitalize"
                style={{ color: accentColor }}
              >
                {pmuscle}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
