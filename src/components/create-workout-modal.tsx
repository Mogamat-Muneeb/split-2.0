/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "./ui/input";
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import { CircleCheck, ArrowLeft } from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import supabase from "@/lib/supabase";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { Exercise, Set, Workout, WorkoutExercise } from "@/lib/types";
import { Button } from "./ui/button";
import SortableExerciseItem from "./sortable-exercise-item";

interface CreateWorkoutModalProps {
  closeModal: () => void;
  workoutToEdit?: Workout | null;
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({
  closeModal,
  workoutToEdit,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    [],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);

  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    if (workoutToEdit) {
      setIsEditing(true);
      setWorkoutName(workoutToEdit.name);
      loadWorkoutExercises(workoutToEdit);
    }
  }, [workoutToEdit]);

  const loadWorkoutExercises = async (workout: Workout) => {
    setIsLoadingWorkout(true);
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(
          `
          *,
          workout_exercises(
            *,
            sets(*)
          )
        `,
        )
        .eq("id", workout.id)
        .single();

      if (error) throw error;

      if (data) {
        const loadedExercises = data.workout_exercises.map((we: any) => ({
          exercise: {
            folder: we.exercise_id,
            images: we.exercise_image ? [we.exercise_image] : [],
            jsonContents: [],
          },
          notes: we.notes || "",
          restTimer: we.rest_timer || "off",
          sets: we.sets.map((set: any) => ({
            weight: set.weight,
            repType: set.reps !== null ? "reps" : "repRange",
            reps: set.reps,
            repRangeMin: set.rep_range_min,
            repRangeMax: set.rep_range_max,
          })),
        }));

        setSelectedExercises(loadedExercises.map((le) => le.exercise));
        setWorkoutExercises(loadedExercises);

        loadedExercises.forEach((le) => {
          initializeSetForm(le.exercise.folder);
        });
      }
    } catch (err) {
      console.error("Error loading workout:", err);
      alert("Failed to load workout data");
    } finally {
      setIsLoadingWorkout(false);
    }
  };

  const [newSetForm, setNewSetForm] = useState<{
    [folder: string]: {
      weight: string;
      repType: "reps" | "repRange";
      reps: string;
      repRangeMin: string;
      repRangeMax: string;
    };
  }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { exercises } = await getFoldersAndContents();

        setExercises(exercises);
        setError(null);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const initializeSetForm = (folder: string) => {
    if (!newSetForm[folder]) {
      setNewSetForm((prev) => ({
        ...prev,
        [folder]: {
          weight: "",
          repType: "reps",
          reps: "",
          repRangeMin: "",
          repRangeMax: "",
        },
      }));
    }
  };

  const addExercise = (exercise: Exercise) => {
    if (!selectedExercises.find((e) => e.folder === exercise.folder)) {
      setSelectedExercises([...selectedExercises, exercise]);
      setWorkoutExercises([
        ...workoutExercises,
        {
          exercise: exercise,
          notes: "",
          restTimer: "off",
          sets: [
            {
              weight: 0,
              repType: "reps",
              reps: 0,
            },
          ],
        },
      ]);
      initializeSetForm(exercise.folder);
      // After adding exercise, switch back to workout details view on mobile
      setShowLibrary(false);
    }
  };

  const removeExercise = (exerciseToRemove: Exercise) => {
    setSelectedExercises(
      selectedExercises.filter(
        (exercise) => exercise.folder !== exerciseToRemove.folder,
      ),
    );
    setWorkoutExercises(
      workoutExercises.filter(
        (we) => we.exercise.folder !== exerciseToRemove.folder,
      ),
    );
    // Clean up form state
    const newFormState = { ...newSetForm };
    delete newFormState[exerciseToRemove.folder];
    setNewSetForm(newFormState);
  };

  const updateWorkoutExercise = (
    folder: string,
    updates: Partial<WorkoutExercise>,
  ) => {
    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder ? { ...we, ...updates } : we,
      ),
    );
  };

  const updateSet = (
    folder: string,
    setIndex: number,
    updates: Partial<Set> | ((currentSet: Set) => Partial<Set>),
  ) => {
    setWorkoutExercises(
      workoutExercises.map((we) => {
        if (we.exercise.folder !== folder) return we;

        return {
          ...we,
          sets: we.sets.map((set, index) => {
            if (index !== setIndex) return set;

            const newUpdates =
              typeof updates === "function" ? updates(set) : updates;

            return { ...set, ...newUpdates };
          }),
        };
      }),
    );
  };

  const addSet = (folder: string) => {
    setWorkoutExercises((prev) =>
      prev.map((we) => {
        if (we.exercise.folder !== folder) return we;

        const lastSet = we.sets[we.sets.length - 1];

        const newSet: Set = lastSet
          ? { ...lastSet }
          : { weight: 0, repType: "reps", reps: 0 };

        return { ...we, sets: [...we.sets, newSet] };
      }),
    );
  };

  const removeSet = (folder: string, setIndex: number) => {
    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder
          ? { ...we, sets: we.sets.filter((_, index) => index !== setIndex) }
          : we,
      ),
    );
  };

  const updateSetForm = (folder: string, field: string, value: any) => {
    setNewSetForm((prev) => ({
      ...prev,
      [folder]: {
        ...prev[folder],
        [field]: value,
      },
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selectedExercises.findIndex(
        (item) => item.folder === active.id,
      );
      const newIndex = selectedExercises.findIndex(
        (item) => item.folder === over?.id,
      );

      const newSelectedExercises = arrayMove(
        selectedExercises,
        oldIndex,
        newIndex,
      );
      setSelectedExercises(newSelectedExercises);

      const newWorkoutExercises = arrayMove(
        workoutExercises,
        oldIndex,
        newIndex,
      );
      setWorkoutExercises(newWorkoutExercises);
    }
  };

  const handleSetDragEnd = (event: DragEndEvent, folder: string) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeSetIndex = parseInt(active.id.toString().split("-set-")[1]);
      const overSetIndex = parseInt(
        over?.id.toString().split("-set-")[1] as any,
      );

      if (!isNaN(activeSetIndex) && !isNaN(overSetIndex)) {
        setWorkoutExercises(
          workoutExercises.map((we) => {
            if (we.exercise.folder === folder) {
              const newSets = arrayMove(we.sets, activeSetIndex, overSetIndex);
              return { ...we, sets: newSets };
            }
            return we;
          }),
        );
      }
    }
  };

  const handleSetDragStart = (event: DragStartEvent, folder: string) => {
    console.warn(`Dragging set ${event.active.id} in folder ${folder}`);
  };

  const handleSaveWorkout = async () => {
    try {
      if (!workoutName.trim()) {
        alert("Workout name is required");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      let workoutId: string;

      if (isEditing && workoutToEdit) {
        // Update existing workout
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .update({
            name: workoutName,
          })
          .eq("id", workoutToEdit.id)
          .select()
          .single();

        if (workoutError) throw workoutError;
        workoutId = workout.id;

        // Delete existing exercises and sets
        const { error: deleteError } = await supabase
          .from("workout_exercises")
          .delete()
          .eq("workout_id", workoutId);

        if (deleteError) throw deleteError;

        // Insert updated exercises and sets
        await insertExercisesAndSets(workoutId, user.id);
      } else {
        // Create new workout
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
            name: workoutName,
          })
          .select()
          .single();

        if (workoutError) throw workoutError;
        workoutId = workout.id;

        await insertExercisesAndSets(workoutId, user.id);
      }

      closeModal();
    } catch (err) {
      console.error("Error saving workout:", err);
      alert("Failed to save workout");
    }
  };

  // Helper function to insert exercises and sets
  const insertExercisesAndSets = async (workoutId: string, userId: string) => {
    // Insert workout exercises
    const exercisesPayload = workoutExercises.map((we, index) => {
      return {
        workout_id: workoutId,
        exercise_id: we.exercise.folder,
        name:
          we.exercise.jsonContents?.[0]?.content?.name ||
          we.exercise.folder.replace(/_/g, " "),
        notes: we.notes,
        rest_timer: we.restTimer,
        position: index,
        exercise_image: we.exercise.images?.[0] || null,
      };
    });

    const { data: insertedExercises, error: exercisesError } = await supabase
      .from("workout_exercises")
      .insert(exercisesPayload)
      .select();

    if (exercisesError) throw exercisesError;

    const setsPayload = insertedExercises.flatMap((ex) => {
      const original = workoutExercises.find(
        (we) => we.exercise.folder === ex.exercise_id,
      );

      if (!original) return [];

      return original.sets.map((set, i) => ({
        workout_exercise_id: ex.id,
        set_number: i + 1,
        weight: set.weight,
        reps: set.repType === "reps" ? set.reps : null,
        rep_range_min: set.repType === "repRange" ? set.repRangeMin : null,
        rep_range_max: set.repType === "repRange" ? set.repRangeMax : null,
      }));
    });

    if (setsPayload.length > 0) {
      const { error: setsError } = await supabase
        .from("sets")
        .insert(setsPayload);

      if (setsError) throw setsError;
    }
  };

  const filteredExercises = exercises.filter((exercise) => {
    const searchLower = searchTerm.toLowerCase();
    const exerciseContent = exercise.jsonContents?.[0]?.content;

    if (!exerciseContent) return false;

    const searchableText = [
      exercise.folder,
      exerciseContent.name,
      exerciseContent.force,
      exerciseContent.level,
      exerciseContent.mechanic,
      exerciseContent.equipment,
      exerciseContent.category,
      ...(exerciseContent.primaryMuscles || []),
      ...(exerciseContent.secondaryMuscles || []),
    ];

    return searchableText.some((field) =>
      field?.toString().toLowerCase().includes(searchLower),
    );
  });

  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const shouldShowWorkoutDetails = () => {
    if (!isMobileView) return true;
    return !showLibrary;
  };

  const shouldShowLibrary = () => {
    if (!isMobileView) return true;
    return showLibrary;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="fixed inset-0 bg-black/20 z-40"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-6xl"
      >
        <div className="bg-white dark:bg-[#2d2d2d] lg:rounded-3xl rounded-0 shadow-xl p-4 lg:m-4 m-0 lg:h-full h-dvh">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left Column - Workout Details */}
            {shouldShowWorkoutDetails() && (
              <div className="flex-1 h-full">
                <div className="flex justify-between items-center pb-4">
                  <h2 className="text-base tracking-tight font-bold text-orange-600">
                    New Workout
                  </h2>

                  {isMobileView && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowLibrary(true)}
                        className="bg-orange-600 text-white hover:bg-orange-700"
                        size="sm"
                      >
                        Add Exercise
                      </Button>
                      <Button
                        onClick={closeModal}
                        variant="outline"
                        className="!border-transparent"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <Input
                  placeholder="Workout name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                />

                <div className="rounded-lg overflow-y-auto mt-2 lg:h-[60vh] lg:max-h-[60vh]  max-h-[90vh]">
                  {selectedExercises.length === 0 ? (
                    <div className="bg-accent rounded-xl px-3 py-4">
                      <p className="font-bold text-base tracking-tight">
                        No exercises added yet
                      </p>
                      <p className="text-sm">
                        Click on exercises from the right panel to add them
                      </p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedExercises.map((e) => e.folder)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 rounded-lg overflow-y-auto ">
                          {selectedExercises.map((exercise) => {
                            const workoutExercise = workoutExercises.find(
                              (we) => we.exercise.folder === exercise.folder,
                            );
                            const setForm = newSetForm[exercise.folder];

                            return (
                              <SortableExerciseItem
                                key={exercise.folder}
                                exercise={exercise}
                                workoutExercise={workoutExercise!}
                                setForm={setForm}
                                updateWorkoutExercise={updateWorkoutExercise}
                                updateSet={updateSet}
                                addSet={addSet}
                                removeSet={removeSet}
                                updateSetForm={updateSetForm}
                                removeExercise={removeExercise}
                                onSetDragEnd={handleSetDragEnd}
                                onSetDragStart={handleSetDragStart}
                                sensors={sensors}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {selectedExercises.length > 0 && (
                  <div className="lg:relative fixed bottom-0 left-0 right-0 px-4 pb-4 z-100">
                    <Button
                      onClick={handleSaveWorkout}
                      className="w-full bg-orange-600 text-foreground hover:bg-orange-600 font-semibold rounded-lg transition-colors mt-4"
                    >
                      Create Workout ({selectedExercises.length} exercises)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Right Column - Exercise Library */}
            {shouldShowLibrary() && (
              <div className="flex-1">
                <div className="space-y-2">
                  <div className="flex flex-col items-start">
                    {/* Back button for mobile */}
                    <div className="flex gap-2 items-center pb-4">
                      {isMobileView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowLibrary(false)}
                          className="shrink-0"
                        >
                          <ArrowLeft size={20} />
                        </Button>
                      )}
                      <h2 className="text-base tracking-tight font-bold ">
                        Exercise Library
                      </h2>
                    </div>
                    <Input
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="bg-accent rounded-lg p-4 lg:max-h-150 max-h-[95vh] overflow-y-auto">
                    {isLoadingWorkout ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <p className="text-gray-500 text-sm">
                            Loading workout...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <p className="text-gray-500 text-sm">
                                Loading exercises...
                              </p>
                            </div>
                          </div>
                        ) : error ? (
                          <div className="text-center py-8">
                            <p className="text-red-500">Error: {error}</p>
                            <button
                              onClick={() => window.location.reload()}
                              className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                            >
                              Try again
                            </button>
                          </div>
                        ) : filteredExercises.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">
                            No exercises found
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {filteredExercises.map((exercise) => {
                              const exerciseData =
                                exercise.jsonContents?.[0]?.content;
                              const primaryMuscles =
                                exerciseData?.primaryMuscles?.join(", ") ||
                                "N/A";

                              return (
                                <motion.div
                                  key={exercise.folder}
                                  whileHover={{ scale: 1.02 }}
                                  className="flex items-center justify-start py-1 overflow-hidden cursor-pointer w-full"
                                  onClick={() => addExercise(exercise)}
                                >
                                  <div className="flex items-center justify-center w-full">
                                    <div className="flex-shrink-0">
                                      {exercise.images[0] && (
                                        <img
                                          src={exercise.images[0]}
                                          alt={exercise.folder}
                                          className="w-10 h-10 rounded-full object-cover grayscale-100"
                                        />
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between w-full ml-3">
                                      <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                          <h4 className="text-[14px] font-medium">
                                            {exerciseData?.name ||
                                              exercise.folder.replace(
                                                /_/g,
                                                " ",
                                              )}
                                          </h4>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          <span className="text-orange-600 font-medium text-[10px] rounded capitalize">
                                            {primaryMuscles}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        {selectedExercises.find(
                                          (e) => e.folder === exercise.folder,
                                        ) && (
                                          <CircleCheck
                                            size={20}
                                            className="fill-orange-600 stroke-white [&>circle]:stroke-none"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CreateWorkoutModal;
