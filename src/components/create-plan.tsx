/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import type { Exercise } from "@/lib/types";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";

import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import supabase from "@/lib/supabase";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

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
import { toast } from "sonner";
import { WEEKDAYS } from "@/lib/utils";
import { CreatePlanHeader } from "./create-plan/create-plan-header";
import { ExerciseLibraryRow } from "./create-plan/exercise-library-row";
import { MobileExerciseLibrarySheet } from "./create-plan/mobile-exercise-library-sheet";
import { SortableDayCard } from "./create-plan/sortable-day-card";
import { SortablePlanExercise } from "./create-plan/sortable-plan-exercise";
import type {
  CreatePlanProps,
  Day,
  Difficulty,
  PlanExercise,
  PlanSet,
} from "./create-plan/types";
import {
  computeMuscleMix,
  computeSplitStats,
  createDefaultSet,
  getSetValuesByRepType,
} from "./create-plan/utils";

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
  const [isStackedLayout, setIsStackedLayout] = useState(false);
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
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const stackedMq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      const mobile = mobileMq.matches;
      setIsMobileView(mobile);
      setIsStackedLayout(stackedMq.matches);
      if (!mobile) setShowMobileLibrary(false);
    };
    sync();
    mobileMq.addEventListener("change", sync);
    stackedMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      stackedMq.removeEventListener("change", sync);
    };
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
    if (!isStackedLayout) return;
    const container = mobileStackRef.current;
    if (!container) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startY = event.clientY;
    const startRatio = mobilePaneRatio;
    mobileDragStateRef.current = { startY, startRatio };

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
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

    window.addEventListener("pointermove", handleMove, { passive: false });
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
    <ExerciseLibraryRow
      key={exercise.folder}
      exercise={exercise}
      onAdd={addExerciseFromLibrary}
    />
  ));

  return (
    <>
      <motion.div
        onClick={closeModal}
        className="fixed inset-0 bg-black/20 z-50"
      />

      <motion.div className="fixed inset-0 z-100 lg:p-4 p-0">
        <div className="bg-white dark:bg-[#2d2d2d] h-full lg:rounded-2xl rounded-0 p-4 flex flex-col">
          <CreatePlanHeader
            splitName={splitName}
            isActive={isActive}
            difficulty={difficulty}
            muscleMix={muscleMix}
            splitStats={splitStats}
            onSplitNameChange={setSplitName}
            onActiveChange={setIsActive}
            onDifficultyChange={setDifficulty}
            onAddDay={addDay}
            onSave={handleSave}
            onCancel={closeModal}
          />

          <div
            className="lg:hidden flex items-center justify-center py-2 my-1 touch-none select-none cursor-row-resize"
            onPointerDown={beginMobileResize}
            role="separator"
            aria-orientation="horizontal"
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
                    isStackedLayout
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
                className="lg:hidden flex items-center justify-center py-2 my-1 touch-none select-none cursor-row-resize"
                onPointerDown={beginMobileResize}
                role="separator"
                aria-orientation="horizontal"
              >
                <div className="h-1 w-16 rounded-full bg-border/70" />
              </div>

              {/* 🏋️ ACTIVE DAY BUILDER */}
              <div
                className="lg:rounded-xl lg:p-3 p-0 overflow-y-auto min-h-0 flex flex-col"
                style={
                  isStackedLayout
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
                    <SortablePlanExercise
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

            <MobileExerciseLibrarySheet
              open={isMobileView && showMobileLibrary}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onClose={() => setShowMobileLibrary(false)}
            >
              {exerciseLibraryRows}
            </MobileExerciseLibrarySheet>

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
